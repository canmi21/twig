/* eslint.config.mjs */

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import oxlint from 'eslint-plugin-oxlint'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'node_modules/**',
			'scripts/**',
			'src/routeTree.gen.ts',
			'worker-configuration.d.ts',
		],
	},
	js.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs}'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	...tseslint.configs.recommendedTypeChecked.map((config) =>
		Object.assign({}, config, { files: ['**/*.{ts,tsx,mts,cts}'] }),
	),
	{
		files: ['**/*.{ts,tsx,mts,cts}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.serviceworker,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'separate-type-imports' },
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'no-console': ['error', { allow: ['warn', 'error'] }],
		},
	},
	{
		// CreateServerFn().validator() chains produce unresolvable generic types
		// That make typescript-eslint infer `any` throughout the handler body.
		// The TypeScript compiler still type-checks these files during build.
		files: ['src/features/*/server/**/*.ts', 'src/routes/**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
		},
	},
	{
		// Seed scripts use Bun shell (unresolvable types) and console for progress output.
		files: ['drizzle/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'no-console': 'off',
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		...reactHooks.configs.flat['recommended-latest'],
	},
	{
		files: ['**/*.{ts,tsx}'],
		extends: [betterTailwindcss.configs.recommended],
		settings: {
			'better-tailwindcss': {
				entryPoint: 'src/styles/tailwind.css',
			},
		},
		rules: {
			'better-tailwindcss/enforce-consistent-class-order': 'off',
			'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
			'better-tailwindcss/no-unknown-classes': 'error',
		},
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
