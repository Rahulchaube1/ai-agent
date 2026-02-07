import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * HTTP Request Node
 *
 * Makes an outbound HTTP request to a specified URL.
 * Supports all common HTTP methods, custom headers, request bodies,
 * authentication (Bearer, Basic, API Key), query parameters, and
 * configurable timeouts / retries.
 *
 * Config:
 *   - url:            string   (the target URL, supports template expressions)
 *   - method:         string   (GET | POST | PUT | DELETE | PATCH | HEAD | OPTIONS)
 *   - headers:        Record<string, string>?
 *   - queryParams:    Record<string, string>?
 *   - body:           any?     (request body – object for JSON, string for text)
 *   - bodyType:       string?  ('json' | 'form' | 'text' | 'binary')
 *   - auth:           object?  ({ type: 'bearer'|'basic'|'apiKey', ... })
 *   - timeout:        number?  (milliseconds, default 30 000)
 *   - retries:        number?  (default 0)
 *   - retryDelay:     number?  (ms between retries, default 1000)
 *   - followRedirects: boolean? (default true)
 *   - responseType:   string?  ('json' | 'text' | 'binary', default 'json')
 *   - continueOnError: boolean?
 */
export class HttpRequestNode implements NodeHandler {
  readonly type = 'http-request';
  readonly category = 'actions';
  readonly description =
    'Makes an HTTP request to an external API or service';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const {
      url,
      method = 'GET',
      headers = {},
      queryParams,
      body,
      bodyType = 'json',
      auth,
      timeout = 30_000,
      retries = 0,
      retryDelay = 1000,
      followRedirects = true,
      responseType = 'json',
    } = { ...config, ...inputs };

    if (!url) {
      throw new Error('HTTP Request node: "url" is required');
    }

    // Build the final URL with query parameters
    const targetUrl = new URL(url);
    if (queryParams && typeof queryParams === 'object') {
      for (const [key, value] of Object.entries(queryParams)) {
        targetUrl.searchParams.append(key, String(value));
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'FlowForge/1.0',
      ...headers,
    };

    // Apply authentication
    if (auth) {
      switch (auth.type) {
        case 'bearer':
          requestHeaders['Authorization'] = `Bearer ${auth.token}`;
          break;
        case 'basic': {
          const credentials = Buffer.from(
            `${auth.username}:${auth.password}`,
          ).toString('base64');
          requestHeaders['Authorization'] = `Basic ${credentials}`;
          break;
        }
        case 'apiKey':
          if (auth.in === 'header') {
            requestHeaders[auth.name || 'X-API-Key'] = auth.value;
          } else {
            targetUrl.searchParams.append(
              auth.name || 'api_key',
              auth.value,
            );
          }
          break;
      }
    }

    // Prepare request body
    let requestBody: string | undefined;
    if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      switch (bodyType) {
        case 'json':
          requestBody = typeof body === 'string' ? body : JSON.stringify(body);
          if (!requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] = 'application/json';
          }
          break;
        case 'form': {
          const formData = new URLSearchParams();
          if (typeof body === 'object') {
            for (const [k, v] of Object.entries(body)) {
              formData.append(k, String(v));
            }
          }
          requestBody = formData.toString();
          if (!requestHeaders['Content-Type']) {
            requestHeaders['Content-Type'] =
              'application/x-www-form-urlencoded';
          }
          break;
        }
        case 'text':
        default:
          requestBody = String(body);
          break;
      }
    }

    // Execute the request with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(targetUrl.toString(), {
          method: method.toUpperCase(),
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
          redirect: followRedirects ? 'follow' : 'manual',
        });

        clearTimeout(timeoutId);

        // Parse response body
        let responseData: any;
        const contentType = response.headers.get('content-type') || '';

        if (responseType === 'json' || contentType.includes('application/json')) {
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }
        } else if (responseType === 'binary') {
          const buffer = await response.arrayBuffer();
          responseData = Buffer.from(buffer).toString('base64');
        } else {
          responseData = await response.text();
        }

        // Build response headers map
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          statusCode: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseData,
          ok: response.ok,
          url: response.url,
          redirected: response.redirected,
          attempt: attempt + 1,
        };
      } catch (error: any) {
        lastError = error;

        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * (attempt + 1)),
          );
        }
      }
    }

    throw new Error(
      `HTTP Request failed after ${retries + 1} attempt(s): ${lastError?.message}`,
    );
  }

  validate(config: Record<string, any>): boolean {
    if (!config.url || typeof config.url !== 'string') return false;
    const validMethods = [
      'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS',
    ];
    if (config.method && !validMethods.includes(config.method.toUpperCase())) {
      return false;
    }
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 0)) {
      return false;
    }
    return true;
  }
}
