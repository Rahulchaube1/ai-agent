import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../common/guards/jwt-auth.guard';

/**
 * Mark a route as public (bypass JWT auth).
 */
const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

interface RequestUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

class CreateWebhookDto {
  workflowId: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: Record<string, unknown>;
}

@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // -------------------------------------------------------
  // Authenticated endpoints for managing webhooks
  // -------------------------------------------------------

  @Post('webhooks')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() _user: RequestUser,
  ) {
    return this.webhooksService.create({
      workflowId: dto.workflowId,
      method: dto.method,
      authentication: dto.authentication,
    });
  }

  @Get('webhooks')
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('workflowId') workflowId?: string) {
    return this.webhooksService.findAll({ workflowId });
  }

  @Delete('webhooks/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.webhooksService.delete(id);
  }

  // -------------------------------------------------------
  // Public endpoints for receiving webhook calls
  // -------------------------------------------------------

  @Post('webhook/:path')
  @Public()
  @HttpCode(HttpStatus.OK)
  async receiveWebhookPost(
    @Param('path') path: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        query[key] = value;
      }
    }

    return this.webhooksService.processWebhook(
      path,
      'POST',
      body,
      headers,
      query,
    );
  }

  @Get('webhook/:path')
  @Public()
  async receiveWebhookGet(
    @Param('path') path: string,
    @Req() req: Request,
  ) {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        query[key] = value;
      }
    }

    return this.webhooksService.processWebhook(
      path,
      'GET',
      {},
      headers,
      query,
    );
  }
}
