export type NotificationKind = 'info' | 'success' | 'warn' | 'error';

export type NotificationInput = {
	title: string;
	body?: string;
	kind?: NotificationKind;
	// ms until auto-dismiss, or 'pinned' to stay until manually closed.
	duration?: number | 'pinned';
};

export type Notification = {
	id: string;
	title: string;
	body?: string;
	kind: NotificationKind;
	duration: number | 'pinned';
};

export const DEFAULT_DURATION_MS = 5000;
