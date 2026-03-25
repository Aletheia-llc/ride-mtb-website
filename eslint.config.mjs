import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Cross-module boundary enforcement: each module may only import from its own internals,
// not from another module's components/lib/hooks/actions.
// src/modules/[A]/** must not import from src/modules/[B]/* where A !== B.
const MODULES = ["creators", "forum", "learn", "bikes", "feed", "marketplace", "parks"];
const INTERNAL_DIRS = ["components", "lib", "hooks", "actions"];

function crossModulePatterns(ownModule) {
  return MODULES
    .filter((m) => m !== ownModule)
    .flatMap((m) => INTERNAL_DIRS.map((dir) => `@/modules/${m}/${dir}/*`));
}

const moduleRuleBlocks = MODULES.map((mod) => ({
  files: [`src/modules/${mod}/**/*.ts`, `src/modules/${mod}/**/*.tsx`],
  ignores: [
    "src/modules/**/*.test.ts",
    "src/modules/**/*.test.tsx",
    "src/modules/**/*.spec.ts",
    "src/modules/**/*.spec.tsx",
  ],
  rules: {
    "no-restricted-imports": ["error", { patterns: crossModulePatterns(mod) }],
  },
}));

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "src/generated/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...moduleRuleBlocks,
  {
    // Test files: allow `as any` casts for mock return values — common Vitest/Jest pattern
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
