import { browser } from '$app/environment';
import { MOTION_KEY, type MotionPreference } from './script';

function read(): MotionPreference {
	if (!browser) return 'full';
	const v = localStorage.getItem(MOTION_KEY);
	if (v === 'full' || v === 'reduce' || v === 'none') return v;
	return 'full';
}

let current = $state<MotionPreference>(read());

export const motion = {
	get value(): MotionPreference {
		return current;
	},
	set(v: MotionPreference) {
		current = v;
		localStorage.setItem(MOTION_KEY, v);
		document.documentElement.dataset.motion = v;
	}
};
