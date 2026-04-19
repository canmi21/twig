import { sequence } from '@sveltejs/kit/hooks';
import { langHandle } from '$lib/hooks/lang';
import { i18nHandle } from '$lib/hooks/i18n';
import { cdnHandle } from '$lib/hooks/cdn';
import { themeHandle } from '$lib/hooks/theme';
import { fontHandle } from '$lib/hooks/font';
import { cjkFontHandle } from '$lib/hooks/cjk-font';
import { codeFontHandle } from '$lib/hooks/code-font';
import { emojiFontHandle } from '$lib/hooks/emoji-font';

export const handle = sequence(
	langHandle,
	i18nHandle,
	cdnHandle,
	themeHandle,
	fontHandle,
	cjkFontHandle,
	codeFontHandle,
	emojiFontHandle
);
