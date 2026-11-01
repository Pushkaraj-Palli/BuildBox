import { AIProviderError } from "@/lib/server/ai/types";
import { GENERATION_LIMITS } from "@/lib/server/generation/template";

export type VersionSnapshotFile = { path: string; content: string; language: string };

export function parseVersionSnapshot(value: unknown): VersionSnapshotFile[] {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray((value as { files?: unknown }).files)) {
    throw new AIProviderError("VERSION_INVALID", "This saved version has an invalid file snapshot.", 422);
  }
  const rawFiles = (value as { files: unknown[] }).files;
  if (rawFiles.length < 1 || rawFiles.length > GENERATION_LIMITS.maxFiles) {
    throw new AIProviderError("VERSION_INVALID", "This saved version has an invalid number of files.", 422);
  }
  const seen = new Set<string>();
  let totalBytes = 0;
  const files = rawFiles.map((rawFile) => {
    if (!rawFile || typeof rawFile !== "object" || Array.isArray(rawFile)) {
      throw new AIProviderError("VERSION_INVALID", "This saved version contains an invalid file entry.", 422);
    }
    const file = rawFile as { path?: unknown; content?: unknown; language?: unknown };
    const filePath = file.path;
    if (typeof filePath !== "string" || !filePath || filePath.length > 240 || filePath.startsWith("/") ||
      filePath.includes("\\") || filePath.includes(":") || !/^[a-zA-Z0-9._/()[\]-]+$/.test(filePath)) {
      throw new AIProviderError("VERSION_INVALID", "This saved version contains an unsafe file path.", 422);
    }
    const segments = filePath.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === ".." ||
      [".git", "node_modules"].includes(segment.toLowerCase()) || segment.toLowerCase().startsWith(".env"))) {
      throw new AIProviderError("VERSION_INVALID", "This saved version contains an unsafe file path.", 422);
    }
    const normalized = filePath.toLowerCase();
    if (seen.has(normalized)) throw new AIProviderError("VERSION_INVALID", "This saved version contains duplicate file paths.", 422);
    seen.add(normalized);
    if (typeof file.content !== "string" || Buffer.byteLength(file.content, "utf8") > GENERATION_LIMITS.maxFileBytes) {
      throw new AIProviderError("VERSION_INVALID", "This saved version contains an oversized or invalid file.", 422);
    }
    totalBytes += Buffer.byteLength(file.content, "utf8");
    const extension = filePath.split(".").at(-1)?.toLowerCase();
    const derivedLanguage = extension === "tsx" ? "tsx" : extension === "ts" ? "typescript" : extension === "css" ? "css" : extension === "json" ? "json" : extension === "html" ? "html" : "text";
    return { path: filePath, content: file.content, language: typeof file.language === "string" ? file.language.slice(0, 40) : derivedLanguage };
  });
  if (totalBytes > GENERATION_LIMITS.maxProjectBytes) {
    throw new AIProviderError("VERSION_INVALID", "This saved version exceeds the project size limit.", 422);
  }
  for (const required of ["app/page.tsx", "app/layout.tsx", "app/globals.css", "package.json"]) {
    if (!seen.has(required)) throw new AIProviderError("VERSION_INVALID", "This saved version is missing a required project file.", 422);
  }
  return files;
}
