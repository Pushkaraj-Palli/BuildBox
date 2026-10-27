import { AIProviderError, type AIProvider } from "@/lib/server/ai/types";
import { OpenAIProvider } from "@/lib/server/ai/openai";

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "openai").trim().toLowerCase();
  if (provider === "openai") return new OpenAIProvider();

  throw new AIProviderError("AI_PROVIDER_UNSUPPORTED", "The configured AI provider is not supported.", 503);
}

export { AIProviderError } from "@/lib/server/ai/types";
export type {
  AIMessage,
  AIProvider,
  AIResult,
  AIStreamEvent,
  AIUsage,
  JSONSchema,
  StructuredOutputOptions,
} from "@/lib/server/ai/types";
