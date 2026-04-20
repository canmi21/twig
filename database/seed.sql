-- Dev seed users — invoked by `just database-seed-local`. The IDs are the
-- canonical fixed values from src/lib/server/auth-roles.ts (DEV_SEED_USERS);
-- keep them in lock-step. INSERT OR REPLACE so the seed is idempotent.
--
-- email_verified=1 lets the dev-overlay sign-in path skip the "verify your
-- email" gate; the OTP itself is still 000000 (forced in auth.ts) so a
-- manual sign-in via /sign-in also works.
INSERT OR REPLACE INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES
	('a0000000000000000000000000000001', 'Dev Admin', 'admin@dev.local', 1,
	 cast(unixepoch('subsecond') * 1000 as integer),
	 cast(unixepoch('subsecond') * 1000 as integer)),
	('b0000000000000000000000000000002', 'Dev User', 'user@dev.local', 1,
	 cast(unixepoch('subsecond') * 1000 as integer),
	 cast(unixepoch('subsecond') * 1000 as integer));
