import { defineConfig } from 'vitest/config';

const DEV_PORT = 23315;

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		env: { DEV_PORT: String(DEV_PORT) }
	}
});
