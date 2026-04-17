import type { LayoutServerLoad } from './$types';

const SITE_STARTED_AT = new Date('2024-10-11T06:24:59+08:00').getTime();
const MS_PER_DAY = 86_400_000;

export const load: LayoutServerLoad = ({ locals }) => {
	const runtimeDays = Math.max(0, Math.floor((Date.now() - SITE_STARTED_AT) / MS_PER_DAY));
	return {
		theme: locals.theme,
		font: locals.font,
		cjkFont: locals.cjkFont,
		htmlLang: locals.htmlLang,
		runtimeDays
	};
};
