/**
 * Category classification for nodes in the FlowForge editor.
 */
export type NodeCategory =
  | 'trigger'
  | 'action'
  | 'logic'
  | 'code'
  | 'ai'
  | 'integration'
  | 'custom';

/**
 * Defines an input port on a node.
 */
export interface NodeInput {
  /** Unique name for this input */
  name: string;
  /** Data type expected (e.g. 'string', 'number', 'object', 'any') */
  type: string;
  /** Whether this input is required for execution */
  required?: boolean;
  /** Human-readable description */
  description?: string;
  /** Default value if not connected */
  default?: unknown;
}

/**
 * Defines an output port on a node.
 */
export interface NodeOutput {
  /** Unique name for this output */
  name: string;
  /** Data type produced (e.g. 'string', 'number', 'object', 'any') */
  type: string;
  /** Human-readable description */
  description?: string;
}

/**
 * Supported field types for node configuration UI.
 */
export type NodeConfigFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'code'
  | 'json'
  | 'password'
  | 'textarea'
  | 'keyvalue';

/**
 * Defines a single configuration field rendered in the node's property panel.
 */
export interface NodeConfigField {
  /** Unique field name (used as the key in config values) */
  name: string;
  /** Display label shown in the editor */
  label: string;
  /** Type of input control to render */
  type: NodeConfigFieldType;
  /** Whether the field must be filled */
  required?: boolean;
  /** Default value for the field */
  default?: unknown;
  /** Help text shown below the field */
  description?: string;
  /** Placeholder text for text-based inputs */
  placeholder?: string;
  /** Options for 'select' type fields */
  options?: Array<{ label: string; value: string | number }>;
  /** Validation rules for the field */
  validation?: {
    /** Minimum value (number) or length (string) */
    min?: number;
    /** Maximum value (number) or length (string) */
    max?: number;
    /** Regex pattern the value must match */
    pattern?: string;
    /** Custom error message for validation failures */
    message?: string;
  };
}

/**
 * Configuration schema for a node, containing all editable fields.
 */
export interface NodeConfig {
  fields: NodeConfigField[];
}

/**
 * Runtime context provided to nodes during execution.
 */
export interface ExecutionContext {
  /** Unique identifier for the current execution run */
  executionId: string;
  /** Identifier of the workflow being executed */
  workflowId: string;
  /** Identifier of the current node instance */
  nodeId: string;
  /** Workflow-scoped variables (read/write during execution) */
  variables: Record<string, unknown>;
  /** Resolved credential values for the node's credential references */
  credentials?: Record<string, string>;
  /** Logger instance scoped to this node */
  logger: {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
  };
}

/**
 * Full definition of a FlowForge node, including metadata and lifecycle hooks.
 */
export interface NodeDefinition {
  /** Unique type identifier (e.g. 'slack-send-message') */
  type: string;
  /** Human-readable display name */
  name: string;
  /** Description shown in the node palette */
  description: string;
  /** Category for grouping in the editor palette */
  category: NodeCategory;
  /** Icon identifier or URL */
  icon: string;
  /** Semantic version of this node definition */
  version: string;
  /** Input ports */
  inputs: NodeInput[];
  /** Output ports */
  outputs: NodeOutput[];
  /** Configuration schema */
  config: NodeConfig;

  /**
   * Main execution handler. Receives input data and context, returns output data.
   */
  execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>;

  /**
   * Optional validation hook called before execution. Should throw
   * ValidationError if the configuration is invalid.
   */
  validate?(config: Record<string, unknown>): Promise<void> | void;

  /**
   * Optional initialisation hook called once when the node is first loaded.
   */
  onInit?(): Promise<void> | void;

  /**
   * Optional teardown hook called when the node is unloaded.
   */
  onDestroy?(): Promise<void> | void;
}

/**
 * Lightweight handler interface for simple nodes that don't need full lifecycle.
 */
export interface NodeHandler {
  /** Unique type identifier */
  type: string;
  /** Category for grouping */
  category: NodeCategory;
  /** Description of what the handler does */
  description: string;

  /**
   * Main execution handler.
   */
  execute(
    inputs: Record<string, unknown>,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>>;

  /**
   * Optional validation hook.
   */
  validate?(config: Record<string, unknown>): Promise<void> | void;
}

/**
 * Definition for an event-driven trigger node.
 */
export interface TriggerDefinition {
  /** Unique type identifier (e.g. 'webhook', 'cron') */
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
   * Called to start listening for events. Returns a teardown function
   * that will be called when the trigger should stop.
   */
  setup(
    config: Record<string, unknown>,
    context: ExecutionContext,
    emit: (data: Record<string, unknown>) => void
  ): Promise<() => void>;
}

/**
 * Definition for a FlowForge plugin that bundles nodes and triggers.
 */
export interface PluginDefinition {
  /** Plugin package name */
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

  /**
   * Optional hook called when the plugin is installed.
   */
  onInstall?(): Promise<void> | void;

  /**
   * Optional hook called when the plugin is uninstalled.
   */
  onUninstall?(): Promise<void> | void;
}
