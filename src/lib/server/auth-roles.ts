// Single source of truth — kept as an ID list to avoid Better Auth's
// admin-plugin schema bloat; promote to a DB column when more than one admin exists.
export const ADMIN_USER_IDS: readonly string[] = ['a0000000000000000000000000000001'];

export type DevRole = 'admin' | 'user';

// All-zero IDs can't collide with generateId's RFC-4122 output; `.local` emails
// are pinned to OTP "000000" and refused by the auth pipeline in production.
export const DEV_SEED_USERS = {
	admin: { id: 'a0000000000000000000000000000001', email: 'admin@dev.local', name: 'Dev Admin' },
	user: { id: 'b0000000000000000000000000000002', email: 'user@dev.local', name: 'Dev User' }
} as const satisfies Record<DevRole, { id: string; email: string; name: string }>;

export function isAdmin(userId: string | undefined | null): boolean {
	return !!userId && ADMIN_USER_IDS.includes(userId);
}
