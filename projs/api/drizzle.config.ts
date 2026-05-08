import type { Config } from 'drizzle-kit';

export default {
	schema: './src/database/schema.ts',
	out: './database/migrations',
	dialect: 'sqlite'
} satisfies Config;
