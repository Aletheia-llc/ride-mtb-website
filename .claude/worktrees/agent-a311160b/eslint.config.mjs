import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

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
  {
    // Cross-module boundary enforcement: prevent one module importing another module's internals.
    // Applies only to non-onboarding module source files (not test files, not app routes).
    // Pattern: src/modules/[A]/** must not import from src/modules/[B]/* where A !== B.
    files: [
      "src/modules/creators/**/*.ts",
      "src/modules/creators/**/*.tsx",
      "src/modules/forum/**/*.ts",
      "src/modules/forum/**/*.tsx",
      "src/modules/learn/**/*.ts",
      "src/modules/learn/**/*.tsx",
      "src/modules/bikes/**/*.ts",
      "src/modules/bikes/**/*.tsx",
      "src/modules/feed/**/*.ts",
      "src/modules/feed/**/*.tsx",
      "src/modules/marketplace/**/*.ts",
      "src/modules/marketplace/**/*.tsx",
    ],
    ignores: [
      "src/modules/**/*.test.ts",
      "src/modules/**/*.test.tsx",
      "src/modules/**/*.spec.ts",
      "src/modules/**/*.spec.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@/modules/*/components/*",
            "@/modules/*/lib/*",
            "@/modules/*/hooks/*",
            "@/modules/*/actions/*",
          ],
        },
      ],
    },
  },
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
