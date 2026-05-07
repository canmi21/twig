// Tracks whether the most recent focus change was driven by keyboard or
// pointer input, and stamps <html data-focus-source="kbd|mouse">. CSS that
// wants the keyboard ring on text inputs — where `:focus-visible` would
// otherwise fire for mouse clicks too — gates on this attribute.

const KBD_NAV_KEYS = new Set([
	'Tab',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
	'Enter',
	' '
]);

export function installFocusSourceTracker(): () => void {
	const root = document.documentElement;

	function markKbd(e: KeyboardEvent) {
		if (KBD_NAV_KEYS.has(e.key)) root.dataset.focusSource = 'kbd';
	}
	function markMouse() {
		root.dataset.focusSource = 'mouse';
	}

	document.addEventListener('keydown', markKbd, true);
	document.addEventListener('mousedown', markMouse, true);
	document.addEventListener('touchstart', markMouse, { capture: true, passive: true });
	document.addEventListener('pointerdown', markMouse, true);

	return () => {
		document.removeEventListener('keydown', markKbd, true);
		document.removeEventListener('mousedown', markMouse, true);
		document.removeEventListener('touchstart', markMouse, { capture: true });
		document.removeEventListener('pointerdown', markMouse, true);
	};
}
