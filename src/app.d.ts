// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			theme: import('$lib/theme/script').Theme;
		}
		interface PageData {
			theme: import('$lib/theme/script').Theme;
		}
		// interface PageState {}
	}
}

export {};
