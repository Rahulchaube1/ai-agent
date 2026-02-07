import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkflowExecutorService } from '../engine/workflow-executor.service';
import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowExecutor: WorkflowExecutorService,
  ) {}

  /**
   * Register a new webhook for a workflow.
   */
  async create(data: {
    workflowId: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    authentication?: Record<string, unknown>;
  }) {
    // Verify the workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: data.workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(
        `Workflow with ID ${data.workflowId} not found`,
      );
    }

    // Generate a unique webhook path
    const path = this.generateWebhookPath(workflow.name);

    // Check for path collision
    const existing = await this.prisma.webhook.findUnique({
      where: { path },
    });

    if (existing) {
      throw new ConflictException(`Webhook path "${path}" already exists`);
    }

    const webhook = await this.prisma.webhook.create({
      data: {
        workflowId: data.workflowId,
        path,
        method: (data.method || 'POST') as any,
        isActive: true,
        authentication: data.authentication || null,
      },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
    });

    this.logger.log(
      `Webhook created for workflow ${data.workflowId} at path /${path}`,
    );
    return webhook;
  }

  /**
   * List all webhooks, optionally filtered by workflowId.
   */
  async findAll(query?: { workflowId?: string }) {
    const where: Record<string, unknown> = {};

    if (query?.workflowId) {
      where.workflowId = query.workflowId;
    }

    return this.prisma.webhook.findMany({
      where,
      include: {
        workflow: {
          select: { id: true, name: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single webhook by ID.
   */
  async findOne(id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: {
        workflow: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  /**
   * Delete a webhook.
   */
  async delete(id: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.prisma.webhook.delete({
      where: { id },
    });

    this.logger.log(`Webhook ${id} deleted`);
    return { message: 'Webhook deleted successfully' };
  }

  /**
   * Process an incoming webhook request by path.
   * Looks up the webhook, verifies the signature if configured,
   * and triggers the associated workflow execution.
   */
  async processWebhook(
    path: string,
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    query: Record<string, string>,
  ) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { path },
      include: {
        workflow: true,
      },
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook not found for path: ${path}`);
    }

    if (!webhook.isActive) {
      throw new BadRequestException('Webhook is disabled');
    }

    if (!webhook.workflow.isActive) {
      throw new BadRequestException('Associated workflow is disabled');
    }

    // Verify method matches
    if (webhook.method !== method) {
      throw new BadRequestException(
        `Webhook expects ${webhook.method} but received ${method}`,
      );
    }

    // Verify signature if authentication is configured
    const auth = webhook.authentication as Record<string, unknown> | null;
    if (auth && auth.type === 'hmac') {
      const secret = auth.secret as string;
      const signatureHeader = auth.headerName as string || 'x-webhook-signature';
      const receivedSignature = headers[signatureHeader.toLowerCase()];

      if (!receivedSignature) {
        throw new BadRequestException('Missing webhook signature');
      }

      const isValid = this.verifyHmacSignature(
        JSON.stringify(body),
        secret,
        receivedSignature,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Trigger the workflow execution
    const inputData = {
      webhookId: webhook.id,
      webhookPath: webhook.path,
      method,
      body,
      headers,
      query,
      timestamp: new Date().toISOString(),
    };

    const executionId = await this.workflowExecutor.executeWorkflow(
      webhook.workflowId,
      undefined,
      inputData,
      'WEBHOOK',
    );

    this.logger.log(
      `Webhook ${webhook.id} triggered execution ${executionId} for workflow ${webhook.workflowId}`,
    );

    return {
      success: true,
      executionId,
      message: 'Workflow execution triggered',
    };
  }

  /**
   * Verify an HMAC-SHA256 signature.
   */
  verifyHmacSignature(
    payload: string,
    secret: string,
    receivedSignature: string,
  ): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique webhook path from the workflow name.
   */
  private generateWebhookPath(workflowName: string): string {
    const slug = workflowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const shortId = uuid().split('-')[0];
    return `${slug}-${shortId}`;
  }
}
