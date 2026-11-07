import { AIProviderError } from "@/lib/server/ai/types";

export const PROJECT_TEMPLATE = {
  framework: "nextjs",
  requiredFiles: ["app/page.tsx", "app/layout.tsx", "app/globals.css"],
  baseDependencies: {
    next: "^15.5.0",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    tailwindcss: "^3.4.17",
    postcss: "^8.5.23",
    autoprefixer: "^10.4.21",
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
  maxFiles: 34,
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

export function createTypeScriptConfig() {
  return {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./*"] },
    },
    include: ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  };
}

export function createPostCssConfig() {
  return `const config = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n\nexport default config;\n`;
}

export function createTailwindConfig() {
  return `import type { Config } from "tailwindcss";\n\nconst config: Config = {\n  content: [\n    "./app/**/*.{js,ts,jsx,tsx,mdx}",\n    "./pages/**/*.{js,ts,jsx,tsx,mdx}",\n    "./components/**/*.{js,ts,jsx,tsx,mdx}",\n    "./src/**/*.{js,ts,jsx,tsx,mdx}",\n  ],\n  theme: { extend: {} },\n  plugins: [],\n};\n\nexport default config;\n`;
}

const TAILWIND_LAYERS = ["@tailwind base;", "@tailwind components;", "@tailwind utilities;"];

/** Supplies Tailwind's controlled build setup to new and legacy project snapshots. */
export function ensureTailwindProjectSetup<T extends { path: string; content: string; language: string }>(files: T[]): T[] {
  const result = files.map((file) => ({ ...file }));
  const packageFile = result.find((file) => file.path === "package.json");
  if (packageFile) {
    try {
      const manifest = JSON.parse(packageFile.content) as { dependencies?: Record<string, string> };
      const dependencies = manifest.dependencies && typeof manifest.dependencies === "object" ? manifest.dependencies : {};
      Object.assign(dependencies, {
        tailwindcss: dependencies.tailwindcss ?? "^3.4.17",
        postcss: dependencies.postcss ?? "^8.5.23",
        autoprefixer: dependencies.autoprefixer ?? "^10.4.21",
      });
      manifest.dependencies = dependencies;
      packageFile.content = JSON.stringify(manifest, null, 2);
    } catch {
      // Project validation reports malformed manifests with its normal diagnostic.
    }
  }

  if (!result.some((file) => file.path === "postcss.config.mjs")) {
    result.push({ path: "postcss.config.mjs", content: createPostCssConfig(), language: "javascript" } as T);
  }
  if (!result.some((file) => file.path === "tailwind.config.ts")) {
    result.push({ path: "tailwind.config.ts", content: createTailwindConfig(), language: "typescript" } as T);
  }

  const globalCss = result.find((file) => file.path === "app/globals.css");
  if (globalCss) {
    const missingLayers = TAILWIND_LAYERS.filter((directive) => !globalCss.content.includes(directive));
    if (missingLayers.length) globalCss.content = `${missingLayers.join("\n")}\n\n${globalCss.content}`;
  }
  return result;
}
