import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import oxlint from 'eslint-plugin-oxlint'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', 'src/routeTree.gen.ts', 'worker-configuration.d.ts'],
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
		files: ['src/features/*/server/**/*.ts', 'src/routes/**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		...reactHooks.configs.flat['recommended-latest'],
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
