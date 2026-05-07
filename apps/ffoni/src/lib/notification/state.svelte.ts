import { DEFAULT_DURATION_MS, type Notification, type NotificationInput } from './script';

const items = $state<Notification[]>([]);
let seq = 0;
// Reference-counted pause: hovering/focusing any toast increments; leaving
// decrements. Freezes every item's rAF loop as a single shared signal so a
// stack of toasts all wait together while the user reads one.
let hoverCount = $state(0);

export const notifications = {
	get items(): Notification[] {
		return items;
	},
	get paused(): boolean {
		return hoverCount > 0;
	},
	hoverEnter(): void {
		hoverCount++;
	},
	hoverLeave(): void {
		if (hoverCount > 0) hoverCount--;
	},
	push(input: NotificationInput): string {
		const id = `n${++seq}`;
		items.push({
			id,
			title: input.title,
			body: input.body,
			kind: input.kind ?? 'info',
			duration: input.duration ?? DEFAULT_DURATION_MS
		});
		return id;
	},
	dismiss(id: string): void {
		const idx = items.findIndex((n) => n.id === id);
		if (idx !== -1) items.splice(idx, 1);
	},
	clear(): void {
		items.splice(0, items.length);
	}
};
