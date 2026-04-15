import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { execFileSync } from 'node:child_process';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

// Resolves the current git commit hash at config-load time.
// Priority: VITE_GIT_COMMIT env var → `git rev-parse HEAD` → 'dev' fallback.
function resolveGitCommit(): string {
	if (process.env.VITE_GIT_COMMIT) return process.env.VITE_GIT_COMMIT;
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], {
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim();
	} catch {
		return 'dev';
	}
}

// Resolves the public origin for this deployment at config-load time.
// Priority: PUBLIC_URL env var → hard-coded fallback.
function resolvePublicUrl(): string {
	if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
	return 'https://canmi.net';
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		Icons({ compiler: 'svelte' }),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// `preferredLanguage` is intentionally omitted — hooks.server.ts owns
			// Accept-Language negotiation (see `resolveLocaleFromAcceptLanguage`),
			// because Paraglide's default matcher silently routes zh-TW/zh-HK to
			// our `zh` locale, which isn't what we want.
			strategy: ['cookie', 'baseLocale'],
			cookieName: 'language'
		})
	],
	define: {
		__APP_GIT_COMMIT__: JSON.stringify(resolveGitCommit()),
		__PUBLIC_URL__: JSON.stringify(resolvePublicUrl())
	},
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
