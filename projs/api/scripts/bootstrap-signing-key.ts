// One-shot: generate a fresh ES256 signing key, encrypt its private JWK with
// MASTER_AES_KEY, and INSERT it into signing_keys with status='active'.
// Run via `just api-bootstrap-key` (local) or with `--remote` for prod.

import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportJWK, generateKeyPair, type JWK } from 'jose';
import { encryptBlob, importMasterKey, jsonEncode } from '../src/lib/crypto';

const masterHex = process.env.MASTER_AES_KEY;
if (!masterHex) {
	console.error(
		'error: MASTER_AES_KEY env var required (64 hex chars; generate with `just api-gen-master-key`)'
	);
	process.exit(1);
}

const masterKey = await importMasterKey(masterHex);

const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
const publicJwk = (await exportJWK(publicKey)) as JWK;
const privateJwk = (await exportJWK(privateKey)) as JWK;

const kid = crypto.randomUUID();
publicJwk.kid = kid;
privateJwk.kid = kid;

const encrypted = await encryptBlob(masterKey, jsonEncode(privateJwk));
const encryptedHex = Array.from(new Uint8Array(encrypted))
	.map((b) => b.toString(16).padStart(2, '0'))
	.join('');

const now = Date.now();
const escapedPublicJwk = JSON.stringify(publicJwk).replace(/'/g, "''");

const sql = `INSERT INTO signing_keys (kid, alg, public_jwk, private_jwk_encrypted, status, created_at) VALUES ('${kid}', 'ES256', '${escapedPublicJwk}', X'${encryptedHex}', 'active', ${now});`;

const remote = process.argv.includes('--remote');
const tmpFile = join(tmpdir(), `twig-bootstrap-${Date.now()}.sql`);
writeFileSync(tmpFile, sql);
try {
	const result = spawnSync(
		'bunx',
		['wrangler', 'd1', 'execute', 'twig_sql', remote ? '--remote' : '--local', '--file', tmpFile],
		{ stdio: 'inherit' }
	);
	if (result.status !== 0) process.exit(result.status ?? 1);
	console.log(`\nsigning key ${kid} created (${remote ? 'remote' : 'local'})`);
} finally {
	unlinkSync(tmpFile);
}
