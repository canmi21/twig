import { DEFAULT_DURATION_MS, type Notification, type NotificationInput } from './script';

const items = $state<Notification[]>([]);
let seq = 0;

export const notifications = {
	get items(): Notification[] {
		return items;
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
