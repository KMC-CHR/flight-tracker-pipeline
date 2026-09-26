import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                AbortController: 'readonly',
                URL: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error'
        }
    }
];