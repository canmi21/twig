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
			font: import('$lib/font/script').FontFamily;
			cjkFont: import('$lib/font/cjk-script').CjkFont;
			codeFont: import('$lib/font/code-script').CodeFont;
			emojiFont: import('$lib/font/emoji-script').EmojiFont;
			htmlLang: string;
			cdn: import('$lib/cdn/hosts').CdnHosts;
		}
		interface PageData {
			theme: import('$lib/theme/script').ThemeState;
			font: import('$lib/font/script').FontFamily;
			cjkFont: import('$lib/font/cjk-script').CjkFont;
			codeFont: import('$lib/font/code-script').CodeFont;
			emojiFont: import('$lib/font/emoji-script').EmojiFont;
			htmlLang: string;
			runtimeDays: number;
			cdn: import('$lib/cdn/hosts').CdnHosts;
		}
	}
}

export {};
