import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * Webhook Trigger Node
 *
 * Serves as the entry point for workflows triggered by an incoming HTTP
 * webhook request. When a webhook hits the platform the orchestration layer
 * resolves the associated workflow and feeds the request payload into the
 * execution engine. This node simply passes through the webhook data so
 * that downstream nodes can consume headers, body, query params, etc.
 *
 * Config:
 *   - path:        string  (webhook URL path, e.g. "/hooks/my-flow")
 *   - method:      string  (HTTP method filter: GET | POST | PUT | DELETE | ANY)
 *   - secret:      string? (optional HMAC shared secret for signature verification)
 *   - headers:     Record<string, string>? (expected/required headers)
 *   - respondWith: object? ({ statusCode: number; body?: any; headers?: Record<string, string> })
 */
export class TriggerWebhookNode implements NodeHandler {
  readonly type = 'trigger-webhook';
  readonly category = 'triggers';
  readonly description =
    'Triggers a workflow when an HTTP webhook request is received';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: ExecutionContext,
  ): Promise<any> {
    // The webhook data is injected into the execution context variables
    // by the webhook controller before the workflow is started.
    const webhookData = context.variables.__webhookData || inputs.__webhookData || {};

    const { method, path, secret } = config;

    // Validate HMAC signature if a secret is configured
    if (secret && webhookData.headers) {
      const signature =
        webhookData.headers['x-hub-signature-256'] ||
        webhookData.headers['x-webhook-signature'];

      if (!signature) {
        throw new Error(
          'Webhook signature missing – the request does not contain a signature header',
        );
      }

      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(webhookData.body))
        .digest('hex');

      const prefixedExpected = `sha256=${expectedSignature}`;
      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(prefixedExpected),
        )
      ) {
        throw new Error('Webhook signature verification failed');
      }
    }

    return {
      method: webhookData.method || method || 'POST',
      path: webhookData.path || path,
      headers: webhookData.headers || {},
      query: webhookData.query || {},
      body: webhookData.body || {},
      params: webhookData.params || {},
      receivedAt: new Date().toISOString(),
    };
  }

  validate(config: Record<string, any>): boolean {
    if (!config.path || typeof config.path !== 'string') return false;
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'];
    if (config.method && !validMethods.includes(config.method)) return false;
    return true;
  }
}
