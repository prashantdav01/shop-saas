// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // Shop isolation: only withShop() may set the shop for a transaction.
    // A session-level set elsewhere could leak one shop's context to the next
    // request on a pooled connection.
    files: ['src/**/*.ts'],
    ignores: ['src/db/with-shop.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/set_config|app\\.shop_id/i]',
          message: 'Set the shop only through withShop() in src/db/with-shop.ts.',
        },
        {
          selector: 'TemplateElement[value.raw=/set_config|app\\.shop_id/i]',
          message: 'Set the shop only through withShop() in src/db/with-shop.ts.',
        },
      ],
    },
  },
);
