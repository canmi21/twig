// Re-run `bunx @better-auth/cli generate` then `just database-generate`
// whenever the auth plugin set changes; app-specific tables go here directly.
export * from './auth-schema';
