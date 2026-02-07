import { NodeHandler } from '../node-registry.service';
import { ExecutionContext } from '../workflow-executor.service';

/**
 * AI / LLM Node
 *
 * Calls an AI language model API (OpenAI-compatible) with a constructed
 * prompt and returns the model's response. Supports system and user
 * messages, temperature, model selection, streaming (collected), and
 * structured output (JSON mode).
 *
 * Config:
 *   - provider:       string    ('openai' | 'anthropic' | 'custom', default 'openai')
 *   - model:          string    (model identifier, e.g. 'gpt-4o', 'claude-3-opus')
 *   - apiKey:         string    (API key; typically injected via credential reference)
 *   - baseUrl:        string?   (custom API base URL)
 *   - messages:       Array<{ role: string; content: string }>
 *   - systemMessage:  string?   (convenience shorthand for a system message)
 *   - userMessage:    string?   (convenience shorthand for a user message)
 *   - temperature:    number?   (0-2, default 0.7)
 *   - maxTokens:      number?   (max tokens in the response)
 *   - topP:           number?   (nucleus sampling parameter)
 *   - frequencyPenalty: number?
 *   - presencePenalty:  number?
 *   - stop:           string[]? (stop sequences)
 *   - responseFormat:  string?  ('text' | 'json_object', default 'text')
 *   - timeout:        number?   (ms, default 60 000)
 *   - retries:        number?   (default 1)
 */
export class AiLlmNode implements NodeHandler {
  readonly type = 'ai-llm';
  readonly category = 'integrations';
  readonly description =
    'Calls an AI language model with a prompt and returns the response';

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: ExecutionContext,
  ): Promise<any> {
    const {
      provider = 'openai',
      model = 'gpt-4o',
      apiKey,
      baseUrl,
      messages: configMessages,
      systemMessage,
      userMessage,
      temperature = 0.7,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
      responseFormat = 'text',
      timeout = 60_000,
      retries = 1,
    } = { ...config, ...inputs };

    if (!apiKey) {
      throw new Error(
        'AI LLM node: "apiKey" is required. Provide it via config or a linked credential.',
      );
    }

    // Build the messages array
    const messages = this.buildMessages(
      configMessages,
      systemMessage,
      userMessage,
    );

    if (messages.length === 0) {
      throw new Error(
        'AI LLM node: at least one message is required (provide "messages", "systemMessage", or "userMessage")',
      );
    }

    // Resolve the API endpoint based on the provider
    const endpoint = this.resolveEndpoint(provider, baseUrl);

    // Build the request body (OpenAI-compatible format)
    const requestBody: Record<string, any> = {
      model,
      messages,
      temperature,
    };

    if (maxTokens) requestBody.max_tokens = maxTokens;
    if (topP !== undefined) requestBody.top_p = topP;
    if (frequencyPenalty !== undefined) requestBody.frequency_penalty = frequencyPenalty;
    if (presencePenalty !== undefined) requestBody.presence_penalty = presencePenalty;
    if (stop) requestBody.stop = stop;
    if (responseFormat === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    // Execute the API call with retry logic
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Set auth headers based on the provider
        if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(
            provider === 'anthropic'
              ? this.toAnthropicFormat(requestBody)
              : requestBody,
          ),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `API returned ${response.status}: ${errorBody}`,
          );
        }

        const responseData = await response.json();
        const duration = Date.now() - startTime;

        // Normalise the response across providers
        const normalised = this.normaliseResponse(
          provider,
          responseData,
          responseFormat,
        );

        return {
          ...normalised,
          model,
          provider,
          duration,
          attempt: attempt + 1,
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < retries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }

    throw new Error(
      `AI LLM node failed after ${retries} attempt(s): ${lastError?.message}`,
    );
  }

  /**
   * Build the messages array from config.
   */
  private buildMessages(
    configMessages: Array<{ role: string; content: string }> | undefined,
    systemMessage: string | undefined,
    userMessage: string | undefined,
  ): Array<{ role: string; content: string }> {
    if (configMessages && Array.isArray(configMessages)) {
      return configMessages;
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }
    return messages;
  }

  /**
   * Resolve the chat completions endpoint for the provider.
   */
  private resolveEndpoint(provider: string, baseUrl?: string): string {
    if (baseUrl) {
      return baseUrl.endsWith('/')
        ? `${baseUrl}chat/completions`
        : `${baseUrl}/chat/completions`;
    }

    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      default:
        throw new Error(
          `AI LLM node: unknown provider "${provider}". ` +
            'Provide a "baseUrl" for custom providers.',
        );
    }
  }

  /**
   * Convert the OpenAI-formatted request body to Anthropic's format.
   */
  private toAnthropicFormat(
    body: Record<string, any>,
  ): Record<string, any> {
    const systemMsg = body.messages?.find(
      (m: any) => m.role === 'system',
    );
    const otherMessages = body.messages?.filter(
      (m: any) => m.role !== 'system',
    );

    const anthropicBody: Record<string, any> = {
      model: body.model,
      messages: otherMessages || [],
      temperature: body.temperature,
    };

    if (systemMsg) {
      anthropicBody.system = systemMsg.content;
    }
    if (body.max_tokens) {
      anthropicBody.max_tokens = body.max_tokens;
    } else {
      anthropicBody.max_tokens = 4096;
    }
    if (body.top_p !== undefined) anthropicBody.top_p = body.top_p;
    if (body.stop) anthropicBody.stop_sequences = body.stop;

    return anthropicBody;
  }

  /**
   * Normalise the response from different providers into a consistent shape.
   */
  private normaliseResponse(
    provider: string,
    responseData: any,
    responseFormat: string,
  ): Record<string, any> {
    let content: string;
    let usage: Record<string, any> = {};
    let finishReason: string | null = null;

    if (provider === 'anthropic') {
      content =
        responseData.content?.[0]?.text ||
        responseData.content?.map((c: any) => c.text).join('') ||
        '';
      usage = {
        promptTokens: responseData.usage?.input_tokens || 0,
        completionTokens: responseData.usage?.output_tokens || 0,
        totalTokens:
          (responseData.usage?.input_tokens || 0) +
          (responseData.usage?.output_tokens || 0),
      };
      finishReason = responseData.stop_reason || null;
    } else {
      // OpenAI-compatible format
      const choice = responseData.choices?.[0];
      content = choice?.message?.content || '';
      finishReason = choice?.finish_reason || null;
      usage = {
        promptTokens: responseData.usage?.prompt_tokens || 0,
        completionTokens: responseData.usage?.completion_tokens || 0,
        totalTokens: responseData.usage?.total_tokens || 0,
      };
    }

    // Attempt to parse JSON if the response format is json_object
    let parsedContent: any = content;
    if (responseFormat === 'json_object') {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        parsedContent = content;
      }
    }

    return {
      content,
      parsed: parsedContent,
      usage,
      finishReason,
    };
  }

  validate(config: Record<string, any>): boolean {
    if (!config.apiKey && !config.credentialId) return false;
    const hasMessages =
      (Array.isArray(config.messages) && config.messages.length > 0) ||
      config.systemMessage ||
      config.userMessage;
    if (!hasMessages) return false;
    if (
      config.temperature !== undefined &&
      (config.temperature < 0 || config.temperature > 2)
    ) {
      return false;
    }
    return true;
  }
}
