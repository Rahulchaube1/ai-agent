import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List executions with pagination and optional filters.
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    workflowId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<Record<string, unknown>>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.workflowId) {
      where.workflowId = query.workflowId;
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        include: {
          workflow: {
            select: { id: true, name: true },
          },
          triggeredBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: {
            select: { nodeExecutions: true },
          },
        },
      }),
      this.prisma.execution.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: executions as unknown as Record<string, unknown>[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single execution by ID, including all node executions.
   */
  async findOne(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: { id: true, name: true, description: true },
        },
        workflowVersion: {
          select: { id: true, version: true },
        },
        triggeredBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        nodeExecutions: {
          orderBy: { startedAt: 'asc' },
        },
        retryOf: {
          select: { id: true, status: true, createdAt: true },
        },
        retries: {
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    return execution;
  }

  /**
   * Cancel a running or pending execution.
   */
  async cancel(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    if (execution.status !== 'RUNNING' && execution.status !== 'PENDING' && execution.status !== 'PAUSED') {
      throw new BadRequestException(
        `Cannot cancel execution with status ${execution.status}`,
      );
    }

    const updated = await this.prisma.execution.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Execution ${id} cancelled`);
    return updated;
  }

  /**
   * Retry a failed or cancelled execution by creating a new execution
   * from the same workflow version.
   */
  async retry(executionId: string) {
    const original = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        workflowVersion: true,
      },
    });

    if (!original) {
      throw new NotFoundException(`Execution with ID ${executionId} not found`);
    }

    if (original.status !== 'FAILED' && original.status !== 'CANCELLED') {
      throw new BadRequestException(
        `Can only retry failed or cancelled executions. Current status: ${original.status}`,
      );
    }

    const newExecution = await this.prisma.execution.create({
      data: {
        workflowId: original.workflowId,
        workflowVersionId: original.workflowVersionId,
        triggeredById: original.triggeredById,
        status: 'PENDING',
        mode: original.mode,
        context: original.context as Record<string, unknown>,
        retryOfId: original.id,
        retryCount: original.retryCount + 1,
      },
    });

    this.logger.log(
      `Execution ${executionId} retried as new execution ${newExecution.id}`,
    );
    return newExecution;
  }

  /**
   * Delete an execution and all its node executions.
   */
  async delete(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    if (execution.status === 'RUNNING') {
      throw new BadRequestException(
        'Cannot delete a running execution. Cancel it first.',
      );
    }

    // Node executions are cascade-deleted via the schema relation
    await this.prisma.execution.delete({
      where: { id },
    });

    this.logger.log(`Execution ${id} deleted`);
    return { message: 'Execution deleted successfully' };
  }

  /**
   * Get aggregate execution stats for an organization's workflows.
   */
  async getStats(organizationId: string) {
    const [total, completed, failed, running, avgDurationResult] =
      await Promise.all([
        this.prisma.execution.count({
          where: { workflow: { organizationId } },
        }),
        this.prisma.execution.count({
          where: { workflow: { organizationId }, status: 'COMPLETED' },
        }),
        this.prisma.execution.count({
          where: { workflow: { organizationId }, status: 'FAILED' },
        }),
        this.prisma.execution.count({
          where: { workflow: { organizationId }, status: 'RUNNING' },
        }),
        this.prisma.execution.aggregate({
          where: {
            workflow: { organizationId },
            status: 'COMPLETED',
            duration: { not: null },
          },
          _avg: { duration: true },
        }),
      ]);

    return {
      total,
      completed,
      failed,
      running,
      avgDuration: Math.round(avgDurationResult._avg.duration || 0),
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
