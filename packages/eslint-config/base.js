import tseslint from "typescript-eslint";

/**
 * Base ESLint configuration for all packages in the monorepo.
 * This provides TypeScript support and common rules.
 */
export const base = tseslint.config(
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // Enforce consistent imports
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Allow unused vars when prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Disable require() warning (sometimes needed in config files)
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);

export default base;
