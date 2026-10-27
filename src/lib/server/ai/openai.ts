import {
  AIProviderError,
  type AIMessage,
  type AIProvider,
  type AIResult,
  type AIStreamEvent,
  type AIUsage,
  type StructuredOutputOptions,
} from "@/lib/server/ai/types";

const API_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 50_000;
const MAX_TOTAL_MESSAGE_CHARS = 100_000;

type OpenAIResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: string; type?: string };
};

type OpenAIStreamChunk = {
  model?: string;
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  error?: { message?: string; code?: string; type?: string };
};

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey) throw new AIProviderError("AI_NOT_CONFIGURED", "AI provider is not configured.", 503);
  if (!model) throw new AIProviderError("AI_NOT_CONFIGURED", "AI model is not configured.", 503);
  return { apiKey, model };
}

function validateMessages(messages: AIMessage[]) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new AIProviderError("AI_INVALID_INPUT", "Provide between 1 and 40 messages.", 400);
  }

  let totalChars = 0;
  for (const message of messages) {
    if (!message || !["system", "user", "assistant"].includes(message.role) ||
      typeof message.content !== "string" || message.content.length === 0 || message.content.length > MAX_MESSAGE_CHARS) {
      throw new AIProviderError("AI_INVALID_INPUT", "AI messages must have a supported role and contain at most 50,000 characters.", 400);
    }
    totalChars += message.content.length;
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) {
      throw new AIProviderError("AI_INVALID_INPUT", "Combined AI message content cannot exceed 100,000 characters.", 400);
    }
  }
}

function readUsage(usage?: { prompt_tokens?: number; completion_tokens?: number } | null): AIUsage {
  return {
    inputTokens: Number.isInteger(usage?.prompt_tokens) ? usage!.prompt_tokens! : null,
    outputTokens: Number.isInteger(usage?.completion_tokens) ? usage!.completion_tokens! : null,
  };
}

async function sendRequest(body: Record<string, unknown>): Promise<Response> {
  const { apiKey } = getConfig();
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AIProviderError("AI_TIMEOUT", "The AI provider took too long to respond.", 504);
    }
    throw new AIProviderError("AI_UNAVAILABLE", "The AI provider could not be reached.", 502);
  }

  if (response.ok) return response;

  if (response.status === 429) {
    let providerCode = "";
    try {
      const body = await response.clone().json() as OpenAIResponse;
      providerCode = `${body.error?.code ?? ""} ${body.error?.type ?? ""}`.toLowerCase();
    } catch {
      // Use the generic rate-limit guidance if the provider response is not JSON.
    }
    if (providerCode.includes("insufficient_quota") || providerCode.includes("billing_hard_limit")) {
      throw new AIProviderError(
        "AI_QUOTA_EXCEEDED",
        "The OpenAI API project has no available quota or has reached its spending limit. Check API billing and project limits, then retry.",
        429,
      );
    }
    throw new AIProviderError(
      "AI_RATE_LIMITED",
      "The OpenAI API rate limit was reached. Wait briefly and retry. If this continues, check the API project's rate limits.",
      429,
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new AIProviderError("AI_CONFIGURATION_ERROR", "The AI provider configuration was rejected.", 503);
  }
  throw new AIProviderError("AI_PROVIDER_ERROR", "The AI provider could not complete the request.", 502);
}

async function parseResponse(response: Response): Promise<OpenAIResponse> {
  try {
    return await response.json() as OpenAIResponse;
  } catch {
    throw new AIProviderError("AI_INVALID_RESPONSE", "The AI provider returned an invalid response.");
  }
}

export class OpenAIProvider implements AIProvider {
  async generateText(messages: AIMessage[]): Promise<AIResult> {
    validateMessages(messages);
    const { model } = getConfig();
    const startedAt = Date.now();
    const response = await sendRequest({ model, messages, stream: false });
    const result = await parseResponse(response);
    const output = result.choices?.[0]?.message?.content;

    if (typeof output !== "string") {
      throw new AIProviderError("AI_EMPTY_RESPONSE", "The AI provider returned no text.");
    }

    return {
      provider: "openai",
      model: result.model || model,
      output,
      usage: readUsage(result.usage),
      durationMs: Date.now() - startedAt,
    };
  }

  async generateStructured<T>(messages: AIMessage[], options: StructuredOutputOptions): Promise<AIResult<T>> {
    validateMessages(messages);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(options.name)) {
      throw new AIProviderError("AI_INVALID_SCHEMA", "Structured output name must be 1 to 64 letters, numbers, underscores, or hyphens.", 400);
    }

    const { model } = getConfig();
    const startedAt = Date.now();
    const response = await sendRequest({
      model,
      messages,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.name,
          description: options.description,
          strict: options.strict ?? true,
          schema: options.schema,
        },
      },
    });
    const result = await parseResponse(response);
    const output = result.choices?.[0]?.message?.content;

    if (typeof output !== "string") {
      throw new AIProviderError("AI_EMPTY_RESPONSE", "The AI provider returned no structured output.");
    }

    let parsed: T;
    try {
      parsed = JSON.parse(output) as T;
    } catch {
      throw new AIProviderError("AI_INVALID_STRUCTURED_RESPONSE", "The AI provider returned invalid structured output.");
    }

    return {
      provider: "openai",
      model: result.model || model,
      output: parsed,
      usage: readUsage(result.usage),
      durationMs: Date.now() - startedAt,
    };
  }

  async *stream(messages: AIMessage[]): AsyncIterable<AIStreamEvent> {
    validateMessages(messages);
    const { model } = getConfig();
    const response = await sendRequest({ model, messages, stream: true, stream_options: { include_usage: true } });

    if (!response.body) throw new AIProviderError("AI_INVALID_RESPONSE", "The AI provider returned an empty stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseModel = model;

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          let chunk: OpenAIStreamChunk;
          try {
            chunk = JSON.parse(data) as OpenAIStreamChunk;
          } catch {
            throw new AIProviderError("AI_INVALID_RESPONSE", "The AI provider returned an invalid stream event.");
          }
          if (chunk.error) throw new AIProviderError("AI_PROVIDER_ERROR", "The AI provider stopped while generating a response.");

          responseModel = chunk.model || responseModel;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length) yield { type: "text_delta", delta };
          if (chunk.usage) {
            yield { type: "completed", provider: "openai", model: responseModel, usage: readUsage(chunk.usage) };
          }
        }

        if (done) break;
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("AI_STREAM_INTERRUPTED", "The AI response stream was interrupted.");
    } finally {
      reader.releaseLock();
    }
  }
}
