import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Set Variable Node
 *
 * Reads, writes, or transforms workflow-level variables that are
 * shared across all nodes in an execution. Variables persist for
 * the duration of the execution and can be referenced via
 * {{vars.variableName}} in other nodes.
 *
 * Config:
 *   - operations: Array<{
 *       name:      string;                       // variable name
 *       operation: 'set' | 'append' | 'increment' | 'decrement' | 'delete' | 'toggle';
 *       value:     any;                          // value to set/append/increment by
 *       expression?: string;                     // JS expression evaluated for the value
 *     }>
 *   - returnVariables: boolean? (whether to include ALL current variables in output, default false)
 */
export class SetVariableNode implements NodeHandler {
  readonly type = 'set-variable';
  readonly category = 'actions';
  readonly description =
    'Gets, sets, or transforms workflow-level variables';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const { operations = [], returnVariables = false } = config;

    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error(
        'Set Variable node: at least one operation is required',
      );
    }

    const results: Array<{
      name: string;
      operation: string;
      previousValue: any;
      newValue: any;
    }> = [];

    for (const op of operations) {
      const { name, operation = 'set', value, expression } = op;

      if (!name || typeof name !== 'string') {
        throw new Error(
          'Set Variable node: each operation must have a "name"',
        );
      }

      const previousValue = context.variables[name];
      let resolvedValue = value;

      // If an expression is provided, evaluate it to compute the value
      if (expression) {
        resolvedValue = this.evaluateExpression(
          expression,
          inputs,
          context.variables,
        );
      }

      switch (operation) {
        case 'set':
          context.variables[name] = resolvedValue;
          break;

        case 'append':
          if (Array.isArray(context.variables[name])) {
            context.variables[name] = [
              ...context.variables[name],
              resolvedValue,
            ];
          } else if (typeof context.variables[name] === 'string') {
            context.variables[name] += String(resolvedValue ?? '');
          } else {
            context.variables[name] = resolvedValue;
          }
          break;

        case 'increment':
          context.variables[name] =
            (Number(context.variables[name]) || 0) +
            (Number(resolvedValue) || 1);
          break;

        case 'decrement':
          context.variables[name] =
            (Number(context.variables[name]) || 0) -
            (Number(resolvedValue) || 1);
          break;

        case 'delete':
          delete context.variables[name];
          break;

        case 'toggle':
          context.variables[name] = !context.variables[name];
          break;

        default:
          throw new Error(
            `Set Variable node: unknown operation "${operation}"`,
          );
      }

      results.push({
        name,
        operation,
        previousValue,
        newValue: context.variables[name],
      });
    }

    const output: Record<string, any> = {
      operations: results,
      operationCount: results.length,
    };

    if (returnVariables) {
      output.variables = { ...context.variables };
    }

    return output;
  }

  /**
   * Simple expression evaluator.
   * Supports basic references like `inputs.body.count` or
   * `vars.counter + 1`. Uses Function constructor for evaluation.
   */
  private evaluateExpression(
    expression: string,
    inputs: Record<string, any>,
    variables: Record<string, any>,
  ): any {
    try {
      const fn = new Function(
        'inputs',
        'vars',
        `"use strict"; return (${expression});`,
      );
      return fn(inputs, variables);
    } catch (error: any) {
      throw new Error(
        `Set Variable node: expression evaluation failed: ${error.message}`,
      );
    }
  }

  validate(config: Record<string, any>): boolean {
    if (!Array.isArray(config.operations) || config.operations.length === 0) {
      return false;
    }
    const validOps = [
      'set', 'append', 'increment', 'decrement', 'delete', 'toggle',
    ];
    return config.operations.every(
      (op: any) =>
        typeof op.name === 'string' &&
        op.name.length > 0 &&
        (!op.operation || validOps.includes(op.operation)),
    );
  }
}
