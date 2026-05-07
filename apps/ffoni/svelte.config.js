import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			platformProxy: {
				configPath: 'wrangler.jsonc',
				persist: true
				// `remoteBindings` defaults to true in wrangler 4.x — that, combined
				// with per-binding `"remote": true` in wrangler.jsonc, is the only
				// expression of the hybrid dev loop: DATABASE stays miniflare-local,
				// EMAIL proxies to the real Cloudflare Email Service (needs wrangler
				// login). Setting this to `false` would stub EMAIL via miniflare's
				// strict MIME validator and 500 on real sends.
			}
		}),
		appDir: '_',
		files: { assets: 'public' }
	}
};

export default config;
