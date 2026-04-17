/// <reference types="unplugin-icons/types/svelte" />
// https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	const __APP_GIT_COMMIT__: string;
	const __PUBLIC_URL__: string;
	const __SERVER_ROUTES__: readonly string[];

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			theme: import('$lib/theme/script').ThemeState;
		}
		interface PageData {
			theme: import('$lib/theme/script').ThemeState;
			runtimeDays: number;
		}
	}
}

export {};
