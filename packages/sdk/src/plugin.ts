import {
  PluginDefinition,
  NodeDefinition,
  TriggerDefinition,
} from './types';

/**
 * Options accepted by the `createPlugin` factory.
 */
export interface CreatePluginOptions {
  /** Plugin package name (e.g. '@myorg/flowforge-slack') */
  name: string;
  /** Semantic version */
  version: string;
  /** Description of the plugin */
  description: string;
  /** Author name or organisation */
  author: string;
  /** Optional icon identifier or URL */
  icon?: string;
  /** Nodes provided by this plugin */
  nodes?: NodeDefinition[];
  /** Triggers provided by this plugin */
  triggers?: TriggerDefinition[];
  /** Optional hook called when the plugin is installed */
  onInstall?(): Promise<void> | void;
  /** Optional hook called when the plugin is uninstalled */
  onUninstall?(): Promise<void> | void;
}

/**
 * Factory function for creating a `PluginDefinition` that bundles one or more
 * nodes and triggers into a single distributable package.
 *
 * @example
 * ```ts
 * const myPlugin = createPlugin({
 *   name: '@myorg/flowforge-utils',
 *   version: '1.0.0',
 *   description: 'Utility nodes for FlowForge',
 *   author: 'My Org',
 *   nodes: [nodeA, nodeB],
 *   triggers: [webhookTrigger],
 * });
 * ```
 */
export function createPlugin(options: CreatePluginOptions): PluginDefinition {
  const {
    name,
    version,
    description,
    author,
    icon,
    nodes,
    triggers,
    onInstall,
    onUninstall,
  } = options;

  return {
    name,
    version,
    description,
    author,
    icon,
    nodes: nodes ?? [],
    triggers: triggers ?? [],
    onInstall,
    onUninstall,
  };
}
