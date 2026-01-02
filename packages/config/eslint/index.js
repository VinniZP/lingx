import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * ESLint flat config for Lingx monorepo
 * @type {import('eslint').Linter.Config[]}
 */
export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  }
);
