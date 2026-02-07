import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

export interface AuditLogParams {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  organizationId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit log entry.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId || null,
          userId: params.userId || null,
          organizationId: params.organizationId,
          details: params.details || null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });

      this.logger.debug(
        `Audit: ${params.action} on ${params.resource}${params.resourceId ? ` (${params.resourceId})` : ''} by user ${params.userId || 'system'}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write audit log: ${message}`);
      // Audit log failures should not break the application flow
    }
  }

  /**
   * Query audit logs with pagination and filters.
   */
  async findAll(
    organizationId: string,
    query: {
      page?: number;
      limit?: number;
      action?: string;
      resource?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId,
    };

    if (query.action) {
      where.action = query.action;
    }

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Record<string, unknown> = {};
      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        createdAt.lte = new Date(query.endDate);
      }
      where.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: logs as unknown as Record<string, unknown>[],
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
   * Get a summary of recent audit activity for an organization.
   */
  async getSummary(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalLogs, actionCounts, topUsers] = await Promise.all([
      this.prisma.auditLog.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { organizationId, createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          createdAt: { gte: since },
          userId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalLogs,
      period: '30d',
      actionBreakdown: actionCounts.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
      topUsers: topUsers.map((u) => ({
        userId: u.userId,
        count: u._count.id,
      })),
    };
  }
}
