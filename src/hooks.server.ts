import { sequence } from '@sveltejs/kit/hooks';
import { langHandle } from '$lib/hooks/lang';
import { i18nHandle } from '$lib/hooks/i18n';
import { cdnHandle } from '$lib/hooks/cdn';
import { themeHandle } from '$lib/hooks/theme';
import { fontHandle } from '$lib/hooks/font/family';
import { cjkFontHandle } from '$lib/hooks/font/cjk';
import { codeFontHandle } from '$lib/hooks/font/code';
import { emojiFontHandle } from '$lib/hooks/font/emoji';
import { authHandle } from '$lib/hooks/auth';

// authHandle goes last because it owns the resolve() call when the request
// targets /api/auth/* (svelteKitHandler dispatches there). For every other
// path it just populates locals.user/session and falls through.
export const handle = sequence(
	langHandle,
	i18nHandle,
	cdnHandle,
	themeHandle,
	fontHandle,
	cjkFontHandle,
	codeFontHandle,
	emojiFontHandle,
	authHandle
);
