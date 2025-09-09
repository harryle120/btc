import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        module: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // optionally 'warn'
      "@typescript-eslint/no-explicit-any": "off", // optionally 'warn'
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        jest: "readonly",
      },
    },
  },
];
