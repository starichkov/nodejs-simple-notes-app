import globals from 'globals';
import eslint from '@eslint/js';

export default [
    {
        ignores: ['coverage/**', 'docs/**', 'node_modules/**'],
    },
    eslint.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.jest,
                ...globals.node,
                fail: 'readonly',
            },
        },
        rules: {
            // Existing abstract methods and integration tests intentionally contain unused parameters.
            'no-unused-vars': 'off',
        },
    },
];
