import { getClientCdnHosts } from '$lib/cdn/hosts';
import {
	COOKIE_MAX_AGE,
	EMOJI_FONT_COOKIE,
	LOADABLE_EMOJI_FONT_IDS,
	linksFor,
	type EmojiFont
} from './emoji-data';

export function setEmojiFontCookie(emoji: EmojiFont): void {
	document.cookie = `${EMOJI_FONT_COOKIE}=${emoji};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

const loadedRuntime = new Set<string>();

function hasLinkInDom(href: string): boolean {
	return document.head.querySelector(`link[href="${href}"]`) !== null;
}

function injectLinks(urls: string[]): void {
	for (const url of urls) {
		if (loadedRuntime.has(url) || hasLinkInDom(url)) {
			loadedRuntime.add(url);
			continue;
		}
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = url;
		link.dataset.emojiLink = '';
		document.head.appendChild(link);
		loadedRuntime.add(url);
	}
}

export function ensureEmojiLoadedForPage(emoji: EmojiFont): void {
	injectLinks(linksFor(emoji, getClientCdnHosts()));
}

export function ensureAllEmojiLoaded(): void {
	const hosts = getClientCdnHosts();
	for (const emoji of LOADABLE_EMOJI_FONT_IDS) {
		injectLinks(linksFor(emoji, hosts));
	}
}

export function applyEmojiFont(emoji: EmojiFont): void {
	ensureEmojiLoadedForPage(emoji);
	setEmojiFontCookie(emoji);
	document.documentElement.dataset.emoji = emoji;
}
