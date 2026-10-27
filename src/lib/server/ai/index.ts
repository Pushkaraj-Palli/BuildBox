import { AIProviderError, type AIProvider } from "@/lib/server/ai/types";
import { GeminiProvider } from "@/lib/server/ai/gemini";

export function getAIProvider(): AIProvider {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new AIProviderError("AI_NOT_CONFIGURED", "Gemini is not configured. Add GEMINI_API_KEY to the server environment.", 503);
  }
  return new GeminiProvider();
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
