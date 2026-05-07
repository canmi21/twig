import {
	COOKIE_MAX_AGE,
	MODE_COOKIE,
	PALETTE_CLASSES,
	PALETTE_COOKIE,
	type Mode,
	type Palette
} from './data';

export function setModeCookie(mode: Mode): void {
	document.cookie = `${MODE_COOKIE}=${mode};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

export function setPaletteCookie(palette: Palette): void {
	if (palette === 'neutral') {
		document.cookie = `${PALETTE_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
	} else {
		document.cookie = `${PALETTE_COOKIE}=${palette};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
	}
}

// Swap theme without tweening the color-variable change. Injects a transition
// suppressor before flipping classes, then removes it after the paint so hover
// transitions elsewhere keep working. Either axis can be changed independently.
export function applyTheme(next: { mode?: Mode; palette?: Palette }): void {
	const root = document.documentElement;

	const suppressor = document.createElement('style');
	suppressor.textContent = `*,*::before,*::after{transition:none !important;}`;
	document.head.appendChild(suppressor);

	if (next.mode !== undefined) {
		root.classList.toggle('dark', next.mode === 'dark');
		setModeCookie(next.mode);
	}
	if (next.palette !== undefined) {
		for (const p of PALETTE_CLASSES) {
			root.classList.toggle(p, p === next.palette);
		}
		setPaletteCookie(next.palette);
	}

	// Force a synchronous style flush so the color swap commits under the
	// suppressor, then remove it on the next tick (next-themes pattern).
	void getComputedStyle(root).backgroundColor;
	setTimeout(() => suppressor.remove(), 1);
}
