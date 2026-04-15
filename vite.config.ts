import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), Icons({ compiler: 'svelte' }), sveltekit()],
	server: {
		port: 23315,
		strictPort: true
	},
	build: {
		rollupOptions: {
			output: {
				hashCharacters: 'hex'
			}
		}
	}
});
