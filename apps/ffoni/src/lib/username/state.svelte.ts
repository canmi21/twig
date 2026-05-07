import { browser } from '$app/environment';
import { USERNAME_KEY } from './script';

function read(): string | null {
	if (!browser) return null;
	return localStorage.getItem(USERNAME_KEY);
}

let current = $state<string | null>(read());

export const username = {
	get value(): string | null {
		return current;
	},
	set(v: string | null): void {
		current = v;
		if (v === null) localStorage.removeItem(USERNAME_KEY);
		else localStorage.setItem(USERNAME_KEY, v);
	}
};
