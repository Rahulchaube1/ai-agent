import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Cron / Schedule Trigger Node
 *
 * Represents a scheduled trigger. The actual scheduling is handled by an
 * external scheduler service that reads the cron expression from the
 * workflow definition and fires executions at the appropriate times.
 * When the scheduler invokes the workflow it passes timing metadata into
 * the context variables. This node simply surfaces that data.
 *
 * Config:
 *   - cronExpression: string  (standard 5/6-field cron expression)
 *   - timezone:       string  (IANA timezone, e.g. "America/New_York")
 *   - enabled:        boolean (whether the schedule is active)
 *   - description:    string? (human-readable schedule description)
 */
export class TriggerCronNode implements NodeHandler {
  readonly type = 'trigger-cron';
  readonly category = 'triggers';
  readonly description =
    'Triggers a workflow on a recurring schedule using a cron expression';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    const { cronExpression, timezone, description } = config;

    // Validate the cron expression format (basic check)
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(
        `Invalid cron expression: "${cronExpression}". ` +
          'Expected 5 or 6 space-separated fields.',
      );
    }

    const scheduledTime =
      context.variables.__scheduledTime || new Date().toISOString();
    const previousRun =
      context.variables.__previousRunTime || null;

    return {
      cronExpression,
      timezone: timezone || 'UTC',
      description: description || this.describeCron(cronExpression),
      scheduledTime,
      previousRun,
      triggeredAt: new Date().toISOString(),
      executionId: context.executionId,
    };
  }

  validate(config: Record<string, any>): boolean {
    if (
      !config.cronExpression ||
      typeof config.cronExpression !== 'string'
    ) {
      return false;
    }
    return this.isValidCronExpression(config.cronExpression);
  }

  /**
   * Basic validation of cron expression format.
   * Accepts standard 5-field (minute hour dom month dow) and
   * 6-field expressions (second minute hour dom month dow).
   */
  private isValidCronExpression(expression: string): boolean {
    if (!expression) return false;
    const parts = expression.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  }

  /**
   * Generate a rough human-readable description of the cron schedule.
   */
  private describeCron(expression: string): string {
    const parts = expression.trim().split(/\s+/);

    // Handle common patterns
    if (expression === '* * * * *') return 'Every minute';
    if (expression === '0 * * * *') return 'Every hour';
    if (expression === '0 0 * * *') return 'Every day at midnight';
    if (expression === '0 0 * * 0') return 'Every Sunday at midnight';
    if (expression === '0 0 1 * *') return 'First day of every month at midnight';

    if (parts.length >= 5) {
      const [minute, hour, dom, month, dow] = parts;
      if (minute !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*') {
        return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }
    }

    return `Cron: ${expression}`;
  }
}
