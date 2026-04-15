/// <reference types="unplugin-icons/types/svelte" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	const __APP_GIT_COMMIT__: string;
	const __PUBLIC_URL__: string;

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
			runtimeDays: number;
		}
		// interface PageState {}
	}
}

export {};
