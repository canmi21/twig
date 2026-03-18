/* vite.config.ts */

import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const disguise = '_next'

const config = defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		tanstackStart({ serverFns: { base: `/${disguise}` } }),
		viteReact(),
	],
	build: {
		cssCodeSplit: true,
		rolldownOptions: {
			output: {
				entryFileNames: `${disguise}/static/[hash:21].js`,
				chunkFileNames: `${disguise}/chunks/[hash:21].js`,
				assetFileNames: `${disguise}/static/[hash:21].[ext]`,
				hashCharacters: 'hex',
			},
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		port: 26315,
	},
})

export default config
