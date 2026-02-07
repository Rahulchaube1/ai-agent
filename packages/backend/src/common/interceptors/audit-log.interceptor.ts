import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface AuditableRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

/**
 * Interceptor that records audit log entries for all HTTP requests.
 * Captures request metadata including the authenticated user, IP address,
 * user agent, HTTP method, path, response status, and duration.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request: AuditableRequest = context
      .switchToHttp()
      .getRequest<AuditableRequest>();
    const startTime: number = Date.now();
    const { method, originalUrl, ip } = request;
    const userAgent: string = request.get('user-agent') || 'unknown';

    // Skip audit logging for health checks and non-mutating reads
    if (this.shouldSkipAudit(method, originalUrl)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (): void => {
          const response = context.switchToHttp().getResponse();
          const statusCode: number = response.statusCode;
          const duration: number = Date.now() - startTime;

          this.recordAuditLog({
            request,
            method,
            path: originalUrl,
            statusCode,
            duration,
            ip: ip || '0.0.0.0',
            userAgent,
          }).catch((error: Error) => {
            this.logger.error(
              `Failed to record audit log: ${error.message}`,
            );
          });
        },
        error: (error: { status?: number }): void => {
          const statusCode: number = error?.status || 500;
          const duration: number = Date.now() - startTime;

          this.recordAuditLog({
            request,
            method,
            path: originalUrl,
            statusCode,
            duration,
            ip: ip || '0.0.0.0',
            userAgent,
          }).catch((err: Error) => {
            this.logger.error(
              `Failed to record audit log: ${err.message}`,
            );
          });
        },
      }),
    );
  }

  private shouldSkipAudit(method: string, url: string): boolean {
    const skipPaths: string[] = ['/health', '/api/v1/health', '/favicon.ico'];
    if (skipPaths.some((path: string) => url.startsWith(path))) {
      return true;
    }
    // Optionally skip GET requests to reduce log volume
    if (method === 'GET') {
      return true;
    }
    return false;
  }

  private async recordAuditLog(params: {
    request: AuditableRequest;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    ip: string;
    userAgent: string;
  }): Promise<void> {
    const { request, method, path, statusCode, duration, ip, userAgent } =
      params;

    const resource: string = this.extractResource(path);
    const resourceId: string | null = this.extractResourceId(path);
    const action: string = this.mapMethodToAction(method);

    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      action,
      resource,
      resourceId,
      userId: request.user?.id || null,
      userEmail: request.user?.email || null,
      ipAddress: ip,
      userAgent,
      method,
      path,
      statusCode,
      duration,
      metadata: null,
      timestamp: new Date(),
    };

    try {
      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (id, action, resource, resource_id, user_id, user_email, ip_address, user_agent, method, path, status_code, duration, metadata, timestamp)
        VALUES (${auditEntry.id}, ${auditEntry.action}, ${auditEntry.resource}, ${auditEntry.resourceId}, ${auditEntry.userId}, ${auditEntry.userEmail}, ${auditEntry.ipAddress}, ${auditEntry.userAgent}, ${auditEntry.method}, ${auditEntry.path}, ${auditEntry.statusCode}, ${auditEntry.duration}, ${JSON.stringify(auditEntry.metadata)}::jsonb, ${auditEntry.timestamp})
      `;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Audit log insert failed (non-critical): ${errorMessage}`,
      );
    }
  }

  private extractResource(path: string): string {
    const segments: string[] = path
      .replace(/^\/api\/v1\/?/, '')
      .split('/')
      .filter(Boolean);

    return segments.length > 0 ? segments[0] : 'unknown';
  }

  private extractResourceId(path: string): string | null {
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match: RegExpMatchArray | null = path.match(uuidRegex);
    return match ? match[0] : null;
  }

  private mapMethodToAction(method: string): string {
    const actionMap: Record<string, string> = {
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
      GET: 'read',
    };
    return actionMap[method.toUpperCase()] || 'unknown';
  }
}
