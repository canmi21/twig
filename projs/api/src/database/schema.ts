import { sqliteTable, text, integer, blob, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

export const identities = sqliteTable(
	'identities',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		providerSubject: text('provider_subject'),
		metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [uniqueIndex('identities_type_subject_uq').on(t.type, t.providerSubject)]
);

export const credentials = sqliteTable(
	'credentials',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		publicKey: blob('public_key').notNull(),
		counter: integer('counter').notNull(),
		transports: text('transports', { mode: 'json' }).$type<string[]>().notNull(),
		deviceType: text('device_type').notNull(),
		backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('credentials_user_idx').on(t.userId)]
);

export const totpSecrets = sqliteTable('totp_secrets', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	secretEncrypted: blob('secret_encrypted').notNull(),
	enrolledAt: integer('enrolled_at', { mode: 'timestamp_ms' }).notNull()
});

export const recoveryCodes = sqliteTable(
	'recovery_codes',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		codeHash: text('code_hash').notNull(),
		usedAt: integer('used_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('recovery_codes_user_idx').on(t.userId)]
);

export const clients = sqliteTable('clients', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	redirectUris: text('redirect_uris', { mode: 'json' }).$type<string[]>().notNull(),
	type: text('type').notNull(),
	secretHash: text('secret_hash'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

// host is freeform — matches a clients.id by convention but is intentionally
// not FK'd, since some hosts (e.g. 'system') are logical areas without a
// dedicated OIDC client. Each row grants a single role; multi-role users have
// multiple rows per host.
export const memberships = sqliteTable(
	'memberships',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		host: text('host').notNull(),
		role: text('role').notNull(),
		grantedAt: integer('granted_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [
		uniqueIndex('memberships_user_host_role_uq').on(t.userId, t.host, t.role),
		index('memberships_user_host_idx').on(t.userId, t.host)
	]
);

export const signingKeys = sqliteTable('signing_keys', {
	kid: text('kid').primaryKey(),
	alg: text('alg').notNull(),
	publicJwk: text('public_jwk', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
	privateJwkEncrypted: blob('private_jwk_encrypted').notNull(),
	status: text('status').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

// family_id supports refresh-rotation reuse detection: re-presenting a
// consumed token revokes the entire family.
export const refreshTokens = sqliteTable(
	'refresh_tokens',
	{
		jti: text('jti').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		clientId: text('client_id').notNull(),
		familyId: text('family_id').notNull(),
		consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
		exp: integer('exp', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [
		index('refresh_tokens_family_idx').on(t.familyId),
		index('refresh_tokens_user_idx').on(t.userId)
	]
);
