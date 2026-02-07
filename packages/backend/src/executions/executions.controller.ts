import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExecutionsService } from './executions.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

class ListExecutionsQueryDto extends PaginationQueryDto {
  status?: string;
  workflowId?: string;
}

@Controller('executions')
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: RequestUser) {
    return this.executionsService.getStats(user.organizationId);
  }

  @Get()
  async findAll(
    @Query() query: ListExecutionsQueryDto,
    @CurrentUser() _user: RequestUser,
  ) {
    return this.executionsService.findAll({
      page: query.page,
      limit: query.limit,
      status: query.status,
      workflowId: query.workflowId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.cancel(id);
  }

  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.retry(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.executionsService.delete(id);
  }
}
