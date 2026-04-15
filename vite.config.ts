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

export default defineConfig({
	plugins: [tailwindcss(), Icons({ compiler: 'svelte' }), sveltekit()],
	define: {
		__APP_GIT_COMMIT__: JSON.stringify(resolveGitCommit())
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
