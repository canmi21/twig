// Single source of truth for "is this user an admin?" — read by app code
// and by the dev-overlay seed. Roles aren't a DB column yet (avoids the
// admin-plugin schema bloat: role/banned/banReason/banExpires/impersonatedBy);
// when more than one human ever needs admin, promote this to a real column.
export const ADMIN_USER_IDS: readonly string[] = ['a0000000000000000000000000000001'];

export type DevRole = 'admin' | 'user';

// Fixed dev seed accounts. IDs are 32-char hex (matches advanced.database.generateId
// in src/lib/server/auth.ts) but use a recognisable all-zero pattern so they can
// never collide with a real RFC-4122-derived ID. Emails end in `.local` which
// the auth pipeline pins to OTP `000000` and refuses to register in production.
export const DEV_SEED_USERS = {
	admin: { id: 'a0000000000000000000000000000001', email: 'admin@dev.local', name: 'Dev Admin' },
	user: { id: 'b0000000000000000000000000000002', email: 'user@dev.local', name: 'Dev User' }
} as const satisfies Record<DevRole, { id: string; email: string; name: string }>;

export function isAdmin(userId: string | undefined | null): boolean {
	return !!userId && ADMIN_USER_IDS.includes(userId);
}
