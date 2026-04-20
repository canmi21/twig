import type { Handle } from '@sveltejs/kit';
import {
	EMOJI_FONT_COOKIE,
	isEmojiFont,
	renderEmojiLinks,
	type EmojiFont
} from '$lib/font/emoji-data';
import { isSettingsPath } from '../shared';

// Emoji font handle mirrors codeFontHandle. `system` means zero network (browser
// resolves the tail 'Apple Color Emoji' / 'Segoe UI Emoji' / 'Noto Color Emoji'
// fallbacks declared in base.css). Twemoji ships one pinned woff2 from jsDelivr;
// Noto Color Emoji comes from Google Fonts as a single face (not subset-split —
// emoji presentation sequences must stay intact across code points).
export const emojiFontHandle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(EMOJI_FONT_COOKIE);
	const emojiFont: EmojiFont = isEmojiFont(cookie) ? cookie : 'twemoji';
	event.locals.emojiFont = emojiFont;

	const links = renderEmojiLinks(emojiFont, isSettingsPath(event.url.pathname), event.locals.cdn);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%emoji_font%', emojiFont).replace('%emoji_links%', links)
	});
};
