import { sha256HexString } from './sha';

// Body-hash ETag. 16 hex chars (64 bits) is comfortably past the birthday
// bound for our cache population and avoids the entropy overhead of full
// sha256. Quoted per RFC 7232 strong-ETag grammar.
export async function bodyEtag(body: string): Promise<string> {
	const full = await sha256HexString(body);
	return `"${full.slice(0, 16)}"`;
}
