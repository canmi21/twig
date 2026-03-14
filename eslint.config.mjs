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
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: ['**/*.{ts,tsx,mts,cts}'],
	})),
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
			'@typescript-eslint/no-explicit-any': 'error',
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		...reactHooks.configs.flat['recommended-latest'],
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
