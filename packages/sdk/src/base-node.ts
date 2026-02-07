import {
  NodeDefinition,
  NodeCategory,
  NodeInput,
  NodeOutput,
  NodeConfig,
  ExecutionContext,
} from './types';
import { ValidationError } from './errors';

/**
 * Abstract base class for FlowForge nodes.
 *
 * Extend this class when you need full lifecycle control (onInit / onDestroy)
 * or want to share logic between related nodes via inheritance.
 *
 * For simpler cases, prefer the `createNode()` factory function.
 *
 * @example
 * ```ts
 * class MyNode extends BaseNode {
 *   type = 'my-node';
 *   name = 'My Node';
 *   description = 'Does something useful';
 *   category: NodeCategory = 'action';
 *   icon = 'sparkles';
 *   version = '1.0.0';
 *   inputs = [{ name: 'data', type: 'object' }];
 *   outputs = [{ name: 'result', type: 'object' }];
 *   config = { fields: [] };
 *
 *   async execute(inputs, config, context) {
 *     return { result: inputs.data };
 *   }
 * }
 * ```
 */
export abstract class BaseNode implements NodeDefinition {
  abstract type: string;
  abstract name: string;
  abstract description: string;
  abstract category: NodeCategory;
  abstract icon: string;
  abstract version: string;
  abstract inputs: NodeInput[];
  abstract outputs: NodeOutput[];
  abstract config: NodeConfig;

  /**
   * Main execution handler. Must be implemented by subclasses.
   */
  abstract execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>;

  /**
   * Default validation that checks all required config fields are present
   * and non-empty. Override to add custom validation logic.
   */
  validate(config: Record<string, unknown>): void {
    for (const field of this.config.fields) {
      if (!field.required) {
        continue;
      }

      const value = config[field.name];

      if (value === undefined || value === null || value === '') {
        throw new ValidationError(
          `Required configuration field "${field.label}" (${field.name}) is missing or empty.`,
          field.name,
          value
        );
      }
    }
  }

  /**
   * Optional initialisation hook. Override to perform setup when the node
   * is first loaded (e.g. establish connections, warm caches).
   */
  async onInit(): Promise<void> {
    // Default no-op; override in subclasses as needed.
  }

  /**
   * Optional teardown hook. Override to clean up resources when the node
   * is unloaded (e.g. close connections, cancel timers).
   */
  async onDestroy(): Promise<void> {
    // Default no-op; override in subclasses as needed.
  }
}
