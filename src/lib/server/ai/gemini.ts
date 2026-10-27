import {
  AIProviderError,
  type AIMessage,
  type AIProvider,
  type AIResult,
  type AIStreamEvent,
  type AIUsage,
  type StructuredOutputOptions,
} from "@/lib/server/ai/types";
import { logger } from "@/lib/server/logger";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 240_000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 50_000;
const MAX_TOTAL_MESSAGE_CHARS = 100_000;
const MAX_STRUCTURED_OUTPUT_TOKENS = 16_384;
const MAX_TEXT_OUTPUT_TOKENS = 4_096;
const MAX_TRANSIENT_RETRIES = 2;

type GeminiResponse = {
  modelVersion?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { code?: number; status?: string; message?: string };
};

function getConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const configuredModel = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
  // Google now routes this deprecated alias to 3.8; use the current model explicitly.
  const model = configuredModel === "gemini-3.7-flash" ? "gemini-3.8-flash" : configuredModel;
  if (!apiKey) throw new AIProviderError("AI_NOT_CONFIGURED", "Gemini is not configured. Add GEMINI_API_KEY to the server environment.", 503);
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new AIProviderError("AI_NOT_CONFIGURED", "GEMINI_MODEL is invalid.", 503);
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

function makeContents(messages: AIMessage[]) {
  const systemText = messages.filter(({ role }) => role === "system").map(({ content }) => content).join("\n\n");
  const contents = messages.filter(({ role }) => role !== "system").map(({ role, content }) => ({
    role: role === "assistant" ? "model" : "user",
    parts: [{ text: content }],
  }));
  if (contents.length === 0) throw new AIProviderError("AI_INVALID_INPUT", "At least one user message is required.", 400);
  return {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
  };
}

function readUsage(usage?: GeminiResponse["usageMetadata"]): AIUsage {
  return {
    inputTokens: Number.isInteger(usage?.promptTokenCount) ? usage!.promptTokenCount! : null,
    outputTokens: Number.isInteger(usage?.candidatesTokenCount) ? usage!.candidatesTokenCount! : null,
  };
}

function readText(response: GeminiResponse): string {
  const candidate = response.candidates?.[0];
  const output = candidate?.content?.parts?.map(({ text }) => text ?? "").join("");
  if (typeof output !== "string" || output.length === 0) {
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new AIProviderError("AI_OUTPUT_TRUNCATED", "Gemini reached its output limit. Try a smaller project request.");
    }
    throw new AIProviderError("AI_EMPTY_RESPONSE", "Gemini returned no text.");
  }
  return output;
}

async function sendRequest(body: Record<string, unknown>, stream = false): Promise<Response> {
  const { apiKey, model } = getConfig();
  const endpoint = `${API_URL}/${encodeURIComponent(model)}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`;
  let response: Response | undefined;
  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AIProviderError("AI_TIMEOUT", "Gemini took too long to respond. Try again.", 504);
      }
      if (attempt < MAX_TRANSIENT_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * (2 ** attempt) + Math.floor(Math.random() * 400)));
        continue;
      }
      throw new AIProviderError("AI_UNAVAILABLE", "Gemini could not be reached. Check your internet connection and try again.", 502);
    }
    const retryableStatus = [408, 500, 502, 503, 504].includes(response.status);
    if (response.status === 429) {
      let message = "";
      try { message = ((await response.clone().json() as GeminiResponse).error?.message ?? "").toLowerCase(); } catch { /* Treat malformed 429 responses as rate limits. */ }
      const exhaustedQuota = message.includes("quota") || message.includes("billing");
      if (exhaustedQuota || attempt === MAX_TRANSIENT_RETRIES) break;
    } else if (!retryableStatus || attempt === MAX_TRANSIENT_RETRIES) {
      break;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const retryDelay = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1_000, 30_000)
      : 1_000 * (2 ** attempt) + Math.floor(Math.random() * 400);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  if (!response) throw new AIProviderError("AI_UNAVAILABLE", "Gemini could not be reached.", 502);

  if (response.ok) return response;

  let providerError: GeminiResponse["error"];
  try { providerError = (await response.clone().json() as GeminiResponse).error; } catch { /* Use a safe generic message. */ }
  if (response.status === 429) {
    const providerMessage = providerError?.message?.toLowerCase() ?? "";
    if (providerMessage.includes("quota") || providerMessage.includes("billing")) {
      throw new AIProviderError("AI_QUOTA_EXCEEDED", "The Gemini API project has reached its available quota. Check Google AI Studio API usage and limits, then retry.", 429);
    }
    throw new AIProviderError("AI_RATE_LIMITED", "The Gemini API rate limit was reached. Wait briefly and retry. If this continues, check the project's API limits.", 429);
  }
  if (response.status === 401 || response.status === 403) {
    throw new AIProviderError("AI_CONFIGURATION_ERROR", "Gemini rejected the API key or project permissions. Check GEMINI_API_KEY and the key's API access.", 503);
  }
  if (response.status === 404) {
    throw new AIProviderError("AI_MODEL_NOT_FOUND", "Gemini could not find the configured model. Check GEMINI_MODEL.", 503);
  }
  if (response.status === 400) {
    const providerMessage = providerError?.message
      ?.replaceAll(apiKey, "[redacted]")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 320);
    throw new AIProviderError(
      "AI_INVALID_REQUEST",
      providerMessage
        ? `Gemini rejected the request: ${providerMessage}`
        : "Gemini rejected the request format or response schema.",
      502,
    );
  }
  const providerMessage = providerError?.message
    ?.replaceAll(apiKey, "[redacted]")
    .replace(/(key\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 320);
  const providerStatus = providerError?.status || `HTTP ${response.status}`;
  logger.error("gemini.request_failed", {
    model,
    status: response.status,
    code: providerStatus,
    message: providerMessage || "Gemini returned no error details.",
  });
  throw new AIProviderError(
    "AI_PROVIDER_ERROR",
    providerMessage
      ? `Gemini request failed (${providerStatus}): ${providerMessage}`
      : `Gemini request failed (${providerStatus}). Check Google AI Studio for service status and API limits, then retry.`,
    502,
  );
}

async function parseResponse(response: Response): Promise<GeminiResponse> {
  try { return await response.json() as GeminiResponse; } catch {
    throw new AIProviderError("AI_INVALID_RESPONSE", "Gemini returned an invalid response.");
  }
}

function generationConfig(options?: StructuredOutputOptions) {
  return {
    // File generation is split into small batches; a smaller output ceiling keeps
    // one slow/oversized response from holding the entire build for several minutes.
    maxOutputTokens: options ? MAX_STRUCTURED_OUTPUT_TOKENS : MAX_TEXT_OUTPUT_TOKENS,
    thinkingConfig: { thinkingLevel: "low" },
    ...(options ? {
      responseFormat: {
        text: {
          mimeType: "APPLICATION_JSON",
          schema: options.schema,
        },
      },
    } : {}),
  };
}

export class GeminiProvider implements AIProvider {
  async generateText(messages: AIMessage[]): Promise<AIResult> {
    validateMessages(messages);
    const { model } = getConfig();
    const startedAt = Date.now();
    const response = await sendRequest({ ...makeContents(messages), generationConfig: generationConfig() });
    const result = await parseResponse(response);
    return {
      provider: "gemini",
      model: result.modelVersion || model,
      output: readText(result),
      usage: readUsage(result.usageMetadata),
      durationMs: Date.now() - startedAt,
    };
  }

  async generateStructured<T>(messages: AIMessage[], options: StructuredOutputOptions): Promise<AIResult<T>> {
    validateMessages(messages);
    const { model } = getConfig();
    const startedAt = Date.now();
    const response = await sendRequest({ ...makeContents(messages), generationConfig: generationConfig(options) });
    const result = await parseResponse(response);
    let output: T;
    try { output = JSON.parse(readText(result)) as T; } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("AI_INVALID_STRUCTURED_RESPONSE", "Gemini returned invalid JSON for the requested schema.");
    }
    return {
      provider: "gemini",
      model: result.modelVersion || model,
      output,
      usage: readUsage(result.usageMetadata),
      durationMs: Date.now() - startedAt,
    };
  }

  async *stream(messages: AIMessage[]): AsyncIterable<AIStreamEvent> {
    validateMessages(messages);
    const { model } = getConfig();
    const response = await sendRequest({ ...makeContents(messages), generationConfig: generationConfig() }, true);
    if (!response.body) throw new AIProviderError("AI_INVALID_RESPONSE", "Gemini returned an empty stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emittedCompletion = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
          if (!data) continue;
          let result: GeminiResponse;
          try { result = JSON.parse(data) as GeminiResponse; } catch {
            throw new AIProviderError("AI_INVALID_RESPONSE", "Gemini returned an invalid stream event.");
          }
          const candidate = result.candidates?.[0];
          const delta = candidate?.content?.parts?.map(({ text }) => text ?? "").join("");
          if (delta) yield { type: "text_delta", delta };
          if (result.usageMetadata) {
            emittedCompletion = true;
            yield { type: "completed", provider: "gemini", model: result.modelVersion || model, usage: readUsage(result.usageMetadata) };
          }
        }
        if (done) break;
      }
      if (!emittedCompletion) yield { type: "completed", provider: "gemini", model, usage: { inputTokens: null, outputTokens: null } };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("AI_STREAM_INTERRUPTED", "The Gemini response stream was interrupted.");
    } finally {
      reader.releaseLock();
    }
  }
}
