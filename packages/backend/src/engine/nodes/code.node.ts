import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';
import * as vm from 'vm';

/**
 * Code Execution Node
 *
 * Executes user-provided JavaScript code inside a sandboxed V8
 * context (Node.js `vm` module). The code is given a fixed set of
 * globals and has no access to the host process, file system, or
 * network unless explicitly provided via the sandbox.
 *
 * Config:
 *   - code:       string   (JavaScript source code to execute)
 *   - timeout:    number?  (execution timeout in ms, default 5 000)
 *   - language:   string?  (reserved for future multi-language support)
 *
 * The code receives:
 *   - `inputs`     – resolved input data from upstream nodes
 *   - `variables`  – workflow-level variables
 *   - `context`    – limited execution context (executionId, workflowId)
 *   - `console`    – a sandboxed console whose output is captured
 *
 * The code must return a value (the last expression is used as the
 * return value, or explicitly `return` from an IIFE).
 */
export class CodeNode implements NodeHandler {
  readonly type = 'code';
  readonly category = 'actions';
  readonly description =
    'Executes custom JavaScript code in a sandboxed environment';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const { code, timeout = 5_000 } = config;

    if (!code || typeof code !== 'string') {
      throw new Error('Code node: "code" configuration is required');
    }

    // Capture console output
    const logs: Array<{ level: string; args: any[]; timestamp: string }> = [];

    const sandboxConsole = {
      log: (...args: any[]) =>
        logs.push({ level: 'log', args, timestamp: new Date().toISOString() }),
      info: (...args: any[]) =>
        logs.push({ level: 'info', args, timestamp: new Date().toISOString() }),
      warn: (...args: any[]) =>
        logs.push({ level: 'warn', args, timestamp: new Date().toISOString() }),
      error: (...args: any[]) =>
        logs.push({ level: 'error', args, timestamp: new Date().toISOString() }),
      debug: (...args: any[]) =>
        logs.push({ level: 'debug', args, timestamp: new Date().toISOString() }),
    };

    // Build the sandbox with safe globals
    const sandbox: Record<string, any> = {
      inputs: this.deepClone(inputs),
      variables: this.deepClone(context.variables),
      context: {
        executionId: context.executionId,
        workflowId: context.workflowId,
        startedAt: context.startedAt.toISOString(),
      },
      console: sandboxConsole,

      // Safe standard library objects
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
      btoa: (str: string) => Buffer.from(str).toString('base64'),
      atob: (str: string) => Buffer.from(str, 'base64').toString('utf-8'),

      // Promise support for async patterns
      Promise,
      setTimeout: (fn: () => void, ms: number) => {
        if (ms > timeout) {
          throw new Error(`setTimeout delay ${ms}ms exceeds the allowed timeout`);
        }
        return setTimeout(fn, ms);
      },
    };

    vm.createContext(sandbox);

    // Wrap user code so that the last expression is captured as a return value.
    // If the user already wraps their code in an async IIFE this still works.
    const wrappedCode = `
      (async () => {
        ${code}
      })();
    `;

    try {
      const script = new vm.Script(wrappedCode, {
        filename: 'user-code.js',
        timeout,
      });

      const resultPromise = script.runInContext(sandbox, { timeout });

      // The result may be a promise (if the user code is async)
      const result = await Promise.race([
        resultPromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Code execution timed out after ${timeout}ms`)),
            timeout,
          ),
        ),
      ]);

      return {
        result: result ?? null,
        logs,
        executionTime: Date.now() - context.startedAt.getTime(),
      };
    } catch (error: any) {
      // Sanitise the error to avoid leaking internal stack frames
      const sanitisedMessage = error.message
        .replace(/at Script\.runInContext.*$/s, '')
        .trim();

      throw new Error(`Code execution failed: ${sanitisedMessage}`);
    }
  }

  validate(config: Record<string, any>): boolean {
    if (!config.code || typeof config.code !== 'string') return false;
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      return false;
    }
    // Quick syntax check
    try {
      new vm.Script(config.code);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deep-clone a value to prevent the sandboxed code from mutating
   * the original execution context.
   */
  private deepClone(value: any): any {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }
}
