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
 * Options accepted by the `createNode` factory. Mirrors `NodeDefinition` but
 * makes the lifecycle hooks explicitly optional for convenience.
 */
export interface CreateNodeOptions {
  type: string;
  name: string;
  description: string;
  category: NodeCategory;
  icon: string;
  version: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  config: NodeConfig;

  execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>;

  validate?(config: Record<string, unknown>): Promise<void> | void;
  onInit?(): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
}

/**
 * Factory function for creating a `NodeDefinition` without extending a class.
 *
 * If no `validate` function is supplied, a default implementation is used that
 * checks all required config fields are present and non-empty.
 *
 * @example
 * ```ts
 * const myNode = createNode({
 *   type: 'http-request',
 *   name: 'HTTP Request',
 *   description: 'Makes an HTTP request',
 *   category: 'action',
 *   icon: 'globe',
 *   version: '1.0.0',
 *   inputs: [{ name: 'url', type: 'string', required: true }],
 *   outputs: [{ name: 'response', type: 'object' }],
 *   config: { fields: [] },
 *   async execute(inputs, config, context) {
 *     // ...
 *     return { response: {} };
 *   },
 * });
 * ```
 */
export function createNode(options: CreateNodeOptions): NodeDefinition {
  const {
    type,
    name,
    description,
    category,
    icon,
    version,
    inputs,
    outputs,
    config,
    execute,
    validate,
    onInit,
    onDestroy,
  } = options;

  const defaultValidate = (configValues: Record<string, unknown>): void => {
    for (const field of config.fields) {
      if (!field.required) {
        continue;
      }

      const value = configValues[field.name];

      if (value === undefined || value === null || value === '') {
        throw new ValidationError(
          `Required configuration field "${field.label}" (${field.name}) is missing or empty.`,
          field.name,
          value
        );
      }
    }
  };

  return {
    type,
    name,
    description,
    category,
    icon,
    version,
    inputs,
    outputs,
    config,
    execute,
    validate: validate ?? defaultValidate,
    onInit,
    onDestroy,
  };
}
