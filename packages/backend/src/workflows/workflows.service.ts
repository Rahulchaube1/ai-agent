import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger: Logger = new Logger(WorkflowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateWorkflowDto,
    userId: string,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        tags: dto.tags || [],
        settings: dto.settings || {},
        createdById: userId,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Create initial version
    await this.prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        nodes: [],
        edges: [],
        variables: {},
        createdById: userId,
      },
    });

    this.logger.log(`Workflow created: ${workflow.id} by user ${userId}`);
    return workflow;
  }

  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      tags?: string[];
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      organizationId,
    };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.tags && options.tags.length > 0) {
      where.tags = { hasSome: options.tags };
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [options.sortBy || 'createdAt']: options.sortOrder || 'desc' },
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: {
            select: { executions: true, versions: true },
          },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: workflows as unknown as Record<string, unknown>[],
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

  async findOne(id: string, organizationId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            workflowNodes: true,
            workflowEdges: true,
          },
        },
        _count: {
          select: { executions: true, versions: true, webhooks: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(
    id: string,
    dto: UpdateWorkflowDto,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(`Workflow updated: ${id}`);
    return updated;
  }

  async remove(id: string, organizationId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    await this.prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Workflow soft-deleted: ${id}`);
    return { message: 'Workflow deleted successfully' };
  }

  async createVersion(
    workflowId: string,
    dto: CreateVersionDto,
    userId: string,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    // Get the latest version number
    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    const version = await this.prisma.workflowVersion.create({
      data: {
        workflowId,
        version: nextVersion,
        nodes: dto.nodes as unknown as Record<string, unknown>[],
        edges: dto.edges as unknown as Record<string, unknown>[],
        variables: dto.variables || {},
        changelog: dto.changelog,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Update the workflow's version counter
    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { version: nextVersion },
    });

    this.logger.log(`Workflow version ${nextVersion} created for workflow ${workflowId}`);
    return version;
  }

  async findVersions(
    workflowId: string,
    organizationId: string,
    options: { page?: number; limit?: number },
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      this.prisma.workflowVersion.findMany({
        where: { workflowId },
        skip,
        take: limit,
        orderBy: { version: 'desc' },
        include: {
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.workflowVersion.count({ where: { workflowId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: versions,
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

  async findVersion(
    workflowId: string,
    versionId: string,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId, workflowId },
      include: {
        workflowNodes: true,
        workflowEdges: true,
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Version with ID ${versionId} not found`);
    }

    return version;
  }

  async execute(
    workflowId: string,
    userId: string,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new BadRequestException('Cannot execute an inactive workflow');
    }

    const latestVersion = workflow.versions[0];
    if (!latestVersion) {
      throw new BadRequestException('Workflow has no versions');
    }

    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        workflowVersionId: latestVersion.id,
        triggeredById: userId,
        status: 'PENDING',
        mode: 'MANUAL',
        context: {},
      },
    });

    this.logger.log(`Execution created: ${execution.id} for workflow ${workflowId}`);
    return execution;
  }

  async activate(id: string, organizationId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: { isActive: true },
    });

    this.logger.log(`Workflow activated: ${id}`);
    return updated;
  }

  async deactivate(id: string, organizationId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Workflow deactivated: ${id}`);
    return updated;
  }

  async duplicate(
    id: string,
    userId: string,
    organizationId: string,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const duplicated = await this.prisma.workflow.create({
      data: {
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        tags: workflow.tags,
        settings: workflow.settings as Record<string, unknown>,
        createdById: userId,
        organizationId,
        isActive: false,
      },
    });

    // Copy the latest version
    const latestVersion = workflow.versions[0];
    if (latestVersion) {
      await this.prisma.workflowVersion.create({
        data: {
          workflowId: duplicated.id,
          version: 1,
          nodes: latestVersion.nodes as unknown as Record<string, unknown>[],
          edges: latestVersion.edges as unknown as Record<string, unknown>[],
          variables: latestVersion.variables as Record<string, unknown>,
          changelog: 'Duplicated from workflow ' + workflow.name,
          createdById: userId,
        },
      });
    }

    this.logger.log(`Workflow duplicated: ${id} -> ${duplicated.id}`);
    return duplicated;
  }
}
