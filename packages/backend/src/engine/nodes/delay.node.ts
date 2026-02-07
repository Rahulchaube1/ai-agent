import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Delay / Wait Node
 *
 * Pauses workflow execution for a specified duration before passing
 * data through to the next node.
 *
 * Config:
 *   - duration:  number  (the wait time in the unit specified)
 *   - unit:      string  ('milliseconds' | 'seconds' | 'minutes' | 'hours', default 'seconds')
 *   - until:     string? (ISO 8601 timestamp to wait until; overrides duration if set)
 *   - maxWait:   number? (maximum wait time in seconds as a safety cap, default 86 400 = 24h)
 */
export class DelayNode implements NodeHandler {
  readonly type = 'delay';
  readonly category = 'logic';
  readonly description =
    'Pauses workflow execution for a specified duration';

  private static readonly MAX_WAIT_DEFAULT = 86_400; // 24 hours in seconds

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const {
      duration,
      unit = 'seconds',
      until,
      maxWait = DelayNode.MAX_WAIT_DEFAULT,
    } = config;

    let waitMs: number;
    const startedAt = new Date();

    if (until) {
      // Wait until a specific timestamp
      const targetTime = new Date(until);
      if (isNaN(targetTime.getTime())) {
        throw new Error(
          `Delay node: invalid "until" timestamp "${until}"`,
        );
      }
      waitMs = targetTime.getTime() - Date.now();
      if (waitMs < 0) waitMs = 0;
    } else if (duration !== undefined && duration !== null) {
      waitMs = this.toMilliseconds(Number(duration), unit);
    } else {
      throw new Error(
        'Delay node: either "duration" or "until" must be specified',
      );
    }

    // Enforce the safety cap
    const maxWaitMs = maxWait * 1000;
    if (waitMs > maxWaitMs) {
      waitMs = maxWaitMs;
    }

    // Perform the delay, checking periodically if the execution was cancelled
    const checkInterval = Math.min(waitMs, 1000);
    let elapsed = 0;

    while (elapsed < waitMs) {
      if (context.status === 'cancelled') {
        return {
          delayed: false,
          reason: 'cancelled',
          elapsedMs: elapsed,
          data: inputs,
        };
      }

      const remaining = waitMs - elapsed;
      const sleepTime = Math.min(checkInterval, remaining);
      await this.sleep(sleepTime);
      elapsed += sleepTime;
    }

    const completedAt = new Date();

    return {
      delayed: true,
      requestedMs: waitMs,
      actualMs: completedAt.getTime() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      data: inputs,
    };
  }

  /**
   * Convert a duration + unit pair to milliseconds.
   */
  private toMilliseconds(duration: number, unit: string): number {
    switch (unit) {
      case 'milliseconds':
      case 'ms':
        return duration;
      case 'seconds':
      case 's':
        return duration * 1000;
      case 'minutes':
      case 'm':
        return duration * 60 * 1000;
      case 'hours':
      case 'h':
        return duration * 60 * 60 * 1000;
      default:
        throw new Error(
          `Delay node: unknown unit "${unit}". ` +
            'Use "milliseconds", "seconds", "minutes", or "hours".',
        );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  validate(config: Record<string, any>): boolean {
    if (config.until) {
      return !isNaN(new Date(config.until).getTime());
    }
    if (config.duration === undefined || config.duration === null) {
      return false;
    }
    if (typeof config.duration !== 'number' || config.duration < 0) {
      return false;
    }
    const validUnits = [
      'milliseconds', 'ms', 'seconds', 's', 'minutes', 'm', 'hours', 'h',
    ];
    if (config.unit && !validUnits.includes(config.unit)) {
      return false;
    }
    return true;
  }
}
