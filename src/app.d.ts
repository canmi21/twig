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
			theme: import('$lib/theme/data').ThemeState;
			font: import('$lib/font/data').FontFamily;
			cjkFont: import('$lib/font/cjk-data').CjkFont;
			codeFont: import('$lib/font/code-data').CodeFont;
			emojiFont: import('$lib/font/emoji-data').EmojiFont;
			htmlLang: string;
			cdn: import('$lib/cdn/hosts').CdnHosts;
			user?: import('$lib/server/auth').Auth['$Infer']['Session']['user'];
			session?: import('$lib/server/auth').Auth['$Infer']['Session']['session'];
		}
		interface PageData {
			theme: import('$lib/theme/data').ThemeState;
			font: import('$lib/font/data').FontFamily;
			cjkFont: import('$lib/font/cjk-data').CjkFont;
			codeFont: import('$lib/font/code-data').CodeFont;
			emojiFont: import('$lib/font/emoji-data').EmojiFont;
			htmlLang: string;
			runtimeDays: number;
			cdn: import('$lib/cdn/hosts').CdnHosts;
			devUser: { id: string; email: string; isAdmin: boolean } | null;
		}
	}
}

export {};
