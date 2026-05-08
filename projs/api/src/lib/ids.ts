// Crypto-strong opaque ID generator. UUID v4 today; swappable to cuid2 / ulid
// later without callers caring as long as the column type stays text.
export function newId(): string {
	return crypto.randomUUID();
}
