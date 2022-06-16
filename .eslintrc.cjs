// @ts-check
/* eslint-disable unicorn/prefer-module */
/* eslint-disable unicorn/no-abusive-eslint-disable */

// eslint-disable-next-line
const { defineConfig } = require('eslint-define-config');

module.exports = defineConfig({
	env: {
		worker: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:import/typescript',
		'plugin:unicorn/all',
		'plugin:sonarjs/recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/strict',
		'prettier',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
	},
	plugins: ['@typescript-eslint', 'import'],
	root: true,
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/require-array-sort-compare': 'error',
		'@typescript-eslint/strict-boolean-expressions': [
			'error',
			{ allowNumber: false, allowString: false },
		],
		'eqeqeq': ['error', 'always', { null: 'ignore' }],
		'import/export': 'error',
		'import/exports-last': 'error',
		'import/extensions': ['error', 'never'],
		'import/first': 'error',
		'import/group-exports': 'error',
		'import/no-absolute-path': 'error',
		'import/no-dynamic-require': 'error',
		'import/no-extraneous-dependencies': ['warn', { devDependencies: false }],
		'import/no-mutable-exports': 'error',
		'import/no-relative-parent-imports': 'error',
		'import/no-self-import': 'error',
		'import/no-unused-modules': 'error',
		'import/no-useless-path-segments': ['error', { noUselessIndex: true }],
		'import/order': [
			'error',
			{
				'alphabetize': { order: 'asc' },
				'newlines-between': 'always',
				'warnOnUnassignedImports': true,
			},
		],
		'no-await-in-loop': 'error',
		// https://typescript-eslint.io/docs/linting/troubleshooting#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
		'no-undef': 'off',
		'no-unused-vars': 'off',
		'sort-keys': ['error', 'asc'],
	},
});
