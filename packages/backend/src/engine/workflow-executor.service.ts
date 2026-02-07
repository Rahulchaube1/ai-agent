import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { NodeRegistry } from './node-registry.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  variables: Record<string, any>;
  nodeOutputs: Map<string, any>;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startedAt: Date;
  errors: Array<{ nodeId: string; error: string; timestamp: Date }>;
}

export interface NodeDefinition {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  position: { x: number; y: number };
}

export interface EdgeDefinition {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: Record<string, any>;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);
  private activeExecutions = new Map<string, ExecutionContext>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private nodeRegistry: NodeRegistry,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Build a DAG (directed acyclic graph) from nodes and edges.
   * Returns an adjacency list mapping each node to its dependencies (upstream nodes).
   */
  buildDAG(
    nodes: NodeDefinition[],
    edges: EdgeDefinition[],
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    nodes.forEach((n) => graph.set(n.id, []));
    edges.forEach((e) => {
      const deps = graph.get(e.targetNodeId) || [];
      deps.push(e.sourceNodeId);
      graph.set(e.targetNodeId, deps);
    });
    return graph;
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Validates that the workflow graph is acyclic.
   */
  topologicalSort(
    nodes: NodeDefinition[],
    edges: EdgeDefinition[],
  ): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    });

    edges.forEach((e) => {
      adjacency.get(e.sourceNodeId)?.push(e.targetNodeId);
      inDegree.set(
        e.targetNodeId,
        (inDegree.get(e.targetNodeId) || 0) + 1,
      );
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const neighbor of adjacency.get(current) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Workflow contains cycles');
    }
    return sorted;
  }

  /**
   * Find nodes whose dependencies have all completed and that are not
   * currently running. These nodes can be dispatched in parallel.
   */
  getExecutableNodes(
    dag: Map<string, string[]>,
    completed: Set<string>,
    running: Set<string>,
  ): string[] {
    const executable: string[] = [];
    dag.forEach((deps, nodeId) => {
      if (!completed.has(nodeId) && !running.has(nodeId)) {
        if (deps.every((d) => completed.has(d))) {
          executable.push(nodeId);
        }
      }
    });
    return executable;
  }

  /**
   * Main execution method.
   * Loads the latest workflow version, builds the DAG, and walks through nodes
   * in topological order, executing independent nodes in parallel.
   */
  async executeWorkflow(
    workflowId: string,
    triggeredById?: string,
    inputData?: Record<string, any>,
    mode: string = 'MANUAL',
  ): Promise<string> {
    // 1. Load the latest published workflow version
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!workflow || !workflow.versions[0]) {
      throw new Error('Workflow not found');
    }

    const version = workflow.versions[0];
    const nodes: NodeDefinition[] = version.nodes as any;
    const edges: EdgeDefinition[] = version.edges as any;

    // 2. Create an execution record in the database
    const execution = await this.prisma.execution.create({
      data: {
        id: uuid(),
        workflowId,
        workflowVersionId: version.id,
        triggeredById,
        status: 'RUNNING',
        mode: mode as any,
        startedAt: new Date(),
        context: inputData || {},
      },
    });

    // 3. Build the in-memory execution context
    const context: ExecutionContext = {
      executionId: execution.id,
      workflowId,
      variables: { ...((version.variables as any) || {}), ...inputData },
      nodeOutputs: new Map(),
      status: 'running',
      startedAt: new Date(),
      errors: [],
    };

    this.activeExecutions.set(execution.id, context);

    // Persist execution state in Redis for distributed visibility
    await this.redis.setWithExpiry(
      `execution:${execution.id}:status`,
      'running',
      3600,
    );

    this.eventEmitter.emit('execution.started', {
      executionId: execution.id,
      workflowId,
    });

    this.logger.log(
      `Execution ${execution.id} started for workflow ${workflowId}`,
    );

    // 4. Build DAG and walk through the execution graph
    try {
      const dag = this.buildDAG(nodes, edges);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const completed = new Set<string>();
      const running = new Set<string>();

      while (completed.size < nodes.length) {
        if (context.status === 'cancelled') break;
        if (context.status === 'paused') {
          await this.waitForResume(execution.id);
          continue;
        }

        const executable = this.getExecutableNodes(dag, completed, running);
        if (executable.length === 0 && running.size === 0) break;

        // Execute all ready nodes in parallel
        const promises = executable.map(async (nodeId) => {
          running.add(nodeId);
          const node = nodeMap.get(nodeId)!;

          const resolvedInputs = this.resolveInputs(node, context);

          const nodeExecution = await this.prisma.nodeExecution.create({
            data: {
              id: uuid(),
              executionId: execution.id,
              nodeId,
              status: 'RUNNING',
              inputData: resolvedInputs,
              startedAt: new Date(),
            },
          });

          this.eventEmitter.emit('node.started', {
            executionId: execution.id,
            nodeId,
            nodeExecutionId: nodeExecution.id,
          });

          this.logger.debug(
            `Node ${nodeId} (${node.type}) started in execution ${execution.id}`,
          );

          try {
            const handler = this.nodeRegistry.getHandler(node.type);
            const output = await handler.execute(
              node.config,
              resolvedInputs,
              context,
            );

            context.nodeOutputs.set(nodeId, output);

            const duration =
              Date.now() - nodeExecution.startedAt.getTime();

            await this.prisma.nodeExecution.update({
              where: { id: nodeExecution.id },
              data: {
                status: 'COMPLETED',
                outputData: output,
                completedAt: new Date(),
                duration,
              },
            });

            this.eventEmitter.emit('node.completed', {
              executionId: execution.id,
              nodeId,
              output,
            });

            this.logger.debug(
              `Node ${nodeId} (${node.type}) completed in ${duration}ms`,
            );

            completed.add(nodeId);
          } catch (error: any) {
            const errorInfo = {
              nodeId,
              error: error.message,
              timestamp: new Date(),
            };
            context.errors.push(errorInfo);

            await this.prisma.nodeExecution.update({
              where: { id: nodeExecution.id },
              data: {
                status: 'FAILED',
                error: { message: error.message, stack: error.stack },
                completedAt: new Date(),
              },
            });

            this.eventEmitter.emit('node.failed', {
              executionId: execution.id,
              nodeId,
              error: error.message,
            });

            this.logger.error(
              `Node ${nodeId} (${node.type}) failed: ${error.message}`,
            );

            // If the node is configured to continue on error, record
            // the error as the output and mark the node as completed.
            if (node.config.continueOnError) {
              context.nodeOutputs.set(nodeId, { error: error.message });
              completed.add(nodeId);
            } else {
              throw error;
            }
          } finally {
            running.delete(nodeId);
          }
        });

        await Promise.all(promises);
      }

      // 5. Mark execution as completed
      context.status = 'completed';
      const totalDuration = Date.now() - context.startedAt.getTime();

      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: totalDuration,
        },
      });

      await this.redis.setWithExpiry(
        `execution:${execution.id}:status`,
        'completed',
        3600,
      );

      this.eventEmitter.emit('execution.completed', {
        executionId: execution.id,
      });

      this.logger.log(
        `Execution ${execution.id} completed in ${totalDuration}ms`,
      );
    } catch (error: any) {
      context.status = 'failed';
      const totalDuration = Date.now() - context.startedAt.getTime();

      await this.prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: { message: error.message, stack: error.stack },
          duration: totalDuration,
        },
      });

      await this.redis.setWithExpiry(
        `execution:${execution.id}:status`,
        'failed',
        3600,
      );

      this.eventEmitter.emit('execution.failed', {
        executionId: execution.id,
        error: error.message,
      });

      this.logger.error(
        `Execution ${execution.id} failed: ${error.message}`,
      );
    } finally {
      this.activeExecutions.delete(execution.id);
      await this.redis.del(`execution:${execution.id}:status`);
    }

    return execution.id;
  }

  /**
   * Resolve node inputs from previous node outputs and workflow variables.
   *
   * Supports template expressions:
   *   {{nodeId.outputKey}}  - references a field from a previous node's output
   *   {{vars.variableName}} - references a workflow-level variable
   */
  private resolveInputs(
    node: NodeDefinition,
    context: ExecutionContext,
  ): Record<string, any> {
    const inputs: Record<string, any> = { ...node.config };

    const resolve = (value: any): any => {
      if (typeof value === 'string') {
        return value
          .replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, nodeId, key) => {
            const output = context.nodeOutputs.get(nodeId);
            return output?.[key] ?? '';
          })
          .replace(/\{\{vars\.(\w+)\}\}/g, (_, key) => {
            return context.variables[key] ?? '';
          });
      }
      if (Array.isArray(value)) return value.map(resolve);
      if (value && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, resolve(v)]),
        );
      }
      return value;
    };

    return resolve(inputs);
  }

  /**
   * Cancel a running execution.
   */
  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'cancelled';
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    await this.redis.setWithExpiry(
      `execution:${executionId}:status`,
      'cancelled',
      3600,
    );

    this.eventEmitter.emit('execution.cancelled', { executionId });
    this.logger.log(`Execution ${executionId} cancelled`);
  }

  /**
   * Pause a running execution.
   */
  async pauseExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'paused';
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'PAUSED' },
    });

    this.eventEmitter.emit('execution.paused', { executionId });
    this.logger.log(`Execution ${executionId} paused`);
  }

  /**
   * Resume a paused execution.
   */
  async resumeExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = 'running';
    }

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: 'RUNNING' },
    });

    await this.redis.publish(
      `execution:${executionId}:resume`,
      'resume',
    );

    this.eventEmitter.emit('execution.resumed', { executionId });
    this.logger.log(`Execution ${executionId} resumed`);
  }

  /**
   * Wait for a paused execution to be resumed.
   * Polls the context status every second.
   */
  private async waitForResume(executionId: string): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const context = this.activeExecutions.get(executionId);
        if (!context || context.status !== 'paused') {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * Get the current execution status, including all node executions.
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    return this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { nodeExecutions: true },
    });
  }

  /**
   * List all currently active (in-memory) executions.
   */
  getActiveExecutions(): Array<{
    executionId: string;
    workflowId: string;
    status: string;
    startedAt: Date;
  }> {
    const result: Array<{
      executionId: string;
      workflowId: string;
      status: string;
      startedAt: Date;
    }> = [];
    this.activeExecutions.forEach((ctx) => {
      result.push({
        executionId: ctx.executionId,
        workflowId: ctx.workflowId,
        status: ctx.status,
        startedAt: ctx.startedAt,
      });
    });
    return result;
  }
}
