import { eq, inArray } from 'drizzle-orm';
import { SignJWT, importJWK, jwtVerify, type JWK, type JWTPayload } from 'jose';
import type { DB } from '../database';
import { signingKeys } from '../database/schema';
import { decryptBlob, jsonDecode } from './crypto';

type ActiveKey = { kid: string; alg: string; privateJwk: JWK; publicJwk: JWK };

// Newest active signing key — picks the most-recently-created row with
// status='active'. Decrypts the private JWK on the fly.
export async function getActiveSigningKey(db: DB, masterKey: CryptoKey): Promise<ActiveKey> {
	const rows = await db
		.select()
		.from(signingKeys)
		.where(eq(signingKeys.status, 'active'))
		.orderBy(signingKeys.createdAt);
	const row = rows[rows.length - 1];
	if (!row) throw new Error('no active signing key — run `just api-bootstrap-key`');
	const decrypted = await decryptBlob(masterKey, row.privateJwkEncrypted as ArrayBuffer);
	return {
		kid: row.kid,
		alg: row.alg,
		privateJwk: jsonDecode<JWK>(decrypted),
		publicJwk: row.publicJwk as JWK
	};
}

// All keys eligible to verify signatures: active keys (current) plus retiring
// keys (still valid until previously-issued tokens have all expired).
export async function getVerifyKeys(db: DB): Promise<Map<string, JWK>> {
	const rows = await db
		.select({ kid: signingKeys.kid, publicJwk: signingKeys.publicJwk })
		.from(signingKeys)
		.where(inArray(signingKeys.status, ['active', 'retiring']));
	return new Map(rows.map((r) => [r.kid, r.publicJwk as JWK]));
}

// JWKS payload for /.well-known/jwks.json — strips private material.
export async function getPublicJwks(db: DB): Promise<{ keys: JWK[] }> {
	const rows = await db
		.select({ kid: signingKeys.kid, alg: signingKeys.alg, publicJwk: signingKeys.publicJwk })
		.from(signingKeys)
		.where(inArray(signingKeys.status, ['active', 'retiring']));
	return {
		keys: rows.map((r) => ({ ...(r.publicJwk as JWK), kid: r.kid, alg: r.alg, use: 'sig' }))
	};
}

export interface SignOpts {
	issuer: string;
	audience: string;
	expiresIn: string;
	subject?: string;
	jti?: string;
}

export async function signJwt(
	db: DB,
	masterKey: CryptoKey,
	payload: JWTPayload,
	opts: SignOpts
): Promise<string> {
	const active = await getActiveSigningKey(db, masterKey);
	const key = await importJWK(active.privateJwk, active.alg);
	const builder = new SignJWT(payload)
		.setProtectedHeader({ alg: active.alg, kid: active.kid })
		.setIssuedAt()
		.setExpirationTime(opts.expiresIn)
		.setIssuer(opts.issuer)
		.setAudience(opts.audience);
	if (opts.subject) builder.setSubject(opts.subject);
	if (opts.jti) builder.setJti(opts.jti);
	return builder.sign(key);
}

export interface VerifyOpts {
	issuer: string;
	audience: string;
}

export async function verifyJwt<T extends JWTPayload = JWTPayload>(
	db: DB,
	token: string,
	opts: VerifyOpts
): Promise<T> {
	const keys = await getVerifyKeys(db);
	const { payload } = await jwtVerify(
		token,
		async (header) => {
			const kid = header.kid;
			if (!kid) throw new Error('missing kid in JWT header');
			const jwk = keys.get(kid);
			if (!jwk) throw new Error(`unknown kid: ${kid}`);
			return importJWK(jwk, header.alg);
		},
		{ issuer: opts.issuer, audience: opts.audience }
	);
	return payload as T;
}
