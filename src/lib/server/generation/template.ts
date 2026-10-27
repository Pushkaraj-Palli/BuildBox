import { AIProviderError } from "@/lib/server/ai/types";

export const PROJECT_TEMPLATE = {
  framework: "nextjs",
  requiredFiles: ["app/page.tsx", "app/layout.tsx", "app/globals.css"],
  baseDependencies: {
    next: "^15.5.0",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  optionalDependencies: {
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.11.11",
    "lucide-react": "^0.469.0",
    "recharts": "^2.15.0",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.0",
  },
} as const;

export const GENERATION_LIMITS = {
  maxFiles: 30,
  maxFileBytes: 200_000,
  maxProjectBytes: 1_000_000,
  filesPerRequest: 2,
} as const;

export function validateProjectDependencies(names: string[]): string[] {
  const allowed = new Set(Object.keys(PROJECT_TEMPLATE.optionalDependencies));
  const normalized = [...new Set(names)];
  const unsupported = normalized.filter((name) => !allowed.has(name));
  if (unsupported.length) {
    throw new AIProviderError("UNSUPPORTED_DEPENDENCY", `Unsupported project dependencies: ${unsupported.join(", ")}.`, 422);
  }
  return normalized;
}

export function createPackageManifest(dependencies: string[]) {
  const optional = PROJECT_TEMPLATE.optionalDependencies as Record<string, string>;
  return {
    name: "buildbox-generated-app",
    private: true,
    version: "0.1.0",
    scripts: { dev: "next dev", build: "next build", start: "next start" },
    dependencies: {
      ...PROJECT_TEMPLATE.baseDependencies,
      ...Object.fromEntries(dependencies.map((name) => [name, optional[name]])),
    },
  };
}
