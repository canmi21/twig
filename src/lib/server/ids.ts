import { v7 as uuidv7 } from 'uuid';

// Project-wide surrogate ID generator. Emits 32-char lowercase hex —
// i.e. UUIDv7 with dashes stripped — so IDs share a visual format with
// the seeded user IDs (`a000...001`, `b000...002`) and with Better
// Auth's 32-hex user/session/account IDs. v7's high 48 bits are a
// millisecond timestamp, so PRIMARY KEY scans return newest-first
// without a separate `created_at` index.
export function newId(): string {
	return uuidv7().replaceAll('-', '');
}
