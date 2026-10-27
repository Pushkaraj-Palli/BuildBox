import type { AIResult } from "@/lib/server/ai/types";
import { getPrisma } from "@/lib/server/prisma";

export type AIUsageContext = {
  userId: string;
  projectId?: string | null;
  generationJobId?: string | null;
};

export async function recordAIUsage(result: AIResult<unknown>, context: AIUsageContext): Promise<void> {
  await getPrisma().usageRecord.create({
    data: {
      userId: context.userId,
      projectId: context.projectId ?? null,
      generationJobId: context.generationJobId ?? null,
      provider: result.provider,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  });
}
