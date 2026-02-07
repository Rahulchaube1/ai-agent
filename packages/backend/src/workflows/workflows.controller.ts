import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

class ListWorkflowsQueryDto extends PaginationQueryDto {
  search?: string;
  tags?: string;
  isActive?: string;
}

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  async create(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.create(dto, user.id, user.organizationId);
  }

  @Get()
  async findAll(
    @Query() query: ListWorkflowsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    const tags = query.tags ? query.tags.split(',').map((t) => t.trim()) : undefined;
    const isActive =
      query.isActive !== undefined ? query.isActive === 'true' : undefined;

    return this.workflowsService.findAll(user.organizationId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      tags,
      isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.findOne(id, user.organizationId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.remove(id, user.organizationId);
  }

  @Post(':id/versions')
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVersionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.createVersion(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  @Get(':id/versions')
  async findVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.findVersions(id, user.organizationId, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/versions/:versionId')
  async findVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.findVersion(id, versionId, user.organizationId);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.execute(id, user.id, user.organizationId);
  }

  @Post(':id/activate')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.activate(id, user.organizationId);
  }

  @Post(':id/deactivate')
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.deactivate(id, user.organizationId);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.workflowsService.duplicate(id, user.id, user.organizationId);
  }
}
