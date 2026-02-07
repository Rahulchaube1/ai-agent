import {
  TriggerDefinition,
  NodeConfig,
  NodeOutput,
  ExecutionContext,
} from './types';

/**
 * Options accepted by the `createTrigger` factory.
 */
export interface CreateTriggerOptions {
  /** Unique type identifier (e.g. 'webhook', 'cron', 'github-push') */
  type: string;
  /** Human-readable display name */
  name: string;
  /** Description of the trigger */
  description: string;
  /** Icon identifier or URL */
  icon: string;
  /** Semantic version */
  version: string;
  /** Configuration schema */
  config: NodeConfig;
  /** Output ports emitted when the trigger fires */
  outputs: NodeOutput[];

  /**
   * Called to start listening for events. The `emit` callback should be
   * invoked each time an event occurs. Returns a teardown function that
   * will be called when the trigger should stop listening.
   */
  setup(
    config: Record<string, unknown>,
    context: ExecutionContext,
    emit: (data: Record<string, unknown>) => void
  ): Promise<() => void>;
}

/**
 * Factory function for creating a `TriggerDefinition`.
 *
 * Triggers are event-driven entry points that start workflow executions.
 * Common examples include webhooks, cron schedules, and third-party event
 * subscriptions.
 *
 * @example
 * ```ts
 * const cronTrigger = createTrigger({
 *   type: 'cron',
 *   name: 'Cron Schedule',
 *   description: 'Fires on a cron schedule',
 *   icon: 'clock',
 *   version: '1.0.0',
 *   config: {
 *     fields: [
 *       { name: 'expression', label: 'Cron Expression', type: 'string', required: true },
 *     ],
 *   },
 *   outputs: [{ name: 'timestamp', type: 'string' }],
 *   async setup(config, context, emit) {
 *     const interval = setInterval(() => {
 *       emit({ timestamp: new Date().toISOString() });
 *     }, parseCron(config.expression as string));
 *     return () => clearInterval(interval);
 *   },
 * });
 * ```
 */
export function createTrigger(options: CreateTriggerOptions): TriggerDefinition {
  const {
    type,
    name,
    description,
    icon,
    version,
    config,
    outputs,
    setup,
  } = options;

  return {
    type,
    name,
    description,
    icon,
    version,
    config,
    outputs,
    setup,
  };
}
