export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AIResult<T = string> = {
  provider: string;
  model: string;
  output: T;
  usage: AIUsage;
  durationMs: number;
};

export type JSONSchema = Record<string, unknown>;

export type StructuredOutputOptions = {
  name: string;
  description?: string;
  schema: JSONSchema;
  strict?: boolean;
};

export type AIStreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "completed"; provider: string; model: string; usage: AIUsage };

export interface AIProvider {
  generateText(messages: AIMessage[]): Promise<AIResult>;
  generateStructured<T>(messages: AIMessage[], options: StructuredOutputOptions): Promise<AIResult<T>>;
  stream(messages: AIMessage[]): AsyncIterable<AIStreamEvent>;
}

export class AIProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
