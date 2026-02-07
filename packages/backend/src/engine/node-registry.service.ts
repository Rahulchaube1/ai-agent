import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ExecutionContext } from './workflow-executor.service';

/**
 * Interface that all node handlers must implement.
 * Each node type (e.g., HTTP request, code execution, conditions)
 * provides its own handler that defines how to execute that node.
 */
export interface NodeHandler {
  /** Unique identifier for this node type, e.g. 'http-request' */
  type: string;

  /** Category for UI grouping, e.g. 'triggers', 'actions', 'logic', 'integrations' */
  category: string;

  /** Human-readable description of what this node does */
  description: string;

  /**
   * Execute the node with the given configuration and inputs.
   * Returns the output data that downstream nodes can consume.
   */
  execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any>;

  /**
   * Optional validation of the node configuration at design time.
   * Returns true if the config is valid.
   */
  validate?(config: Record<string, any>): boolean;
}

/**
 * Central registry for all node handlers.
 * Node handlers register themselves here and the workflow executor
 * looks them up by type when executing each node.
 */
@Injectable()
export class NodeRegistry implements OnModuleInit {
  private readonly logger = new Logger(NodeRegistry.name);
  private handlers = new Map<string, NodeHandler>();

  constructor() {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `Node registry initialised with ${this.handlers.size} handler(s)`,
    );
  }

  /**
   * Register a node handler. If a handler with the same type already
   * exists it will be overwritten (useful for plugin overrides).
   */
  register(handler: NodeHandler): void {
    if (this.handlers.has(handler.type)) {
      this.logger.warn(
        `Overwriting existing handler for node type "${handler.type}"`,
      );
    }
    this.handlers.set(handler.type, handler);
    this.logger.log(
      `Registered node handler: ${handler.type} [${handler.category}]`,
    );
  }

  /**
   * Retrieve a handler by its node type.
   * Throws if no handler is found for the requested type.
   */
  getHandler(type: string): NodeHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(
        `No handler registered for node type "${type}". ` +
          `Available types: ${[...this.handlers.keys()].join(', ')}`,
      );
    }
    return handler;
  }

  /**
   * Return all registered handlers.
   */
  getAllHandlers(): NodeHandler[] {
    return [...this.handlers.values()];
  }

  /**
   * Return all handlers belonging to a given category.
   */
  getByCategory(category: string): NodeHandler[] {
    return [...this.handlers.values()].filter(
      (h) => h.category === category,
    );
  }

  /**
   * Check whether a handler exists for the given type.
   */
  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }

  /**
   * Remove a handler from the registry (e.g. when unloading a plugin).
   */
  unregister(type: string): boolean {
    const removed = this.handlers.delete(type);
    if (removed) {
      this.logger.log(`Unregistered node handler: ${type}`);
    }
    return removed;
  }

  /**
   * Return a summary of all registered types grouped by category.
   */
  getRegistrySummary(): Record<string, string[]> {
    const summary: Record<string, string[]> = {};
    this.handlers.forEach((handler) => {
      if (!summary[handler.category]) {
        summary[handler.category] = [];
      }
      summary[handler.category].push(handler.type);
    });
    return summary;
  }
}
