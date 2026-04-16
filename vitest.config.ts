import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const DEV_PORT = 23315;

export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve(import.meta.dirname, 'src/lib')
		}
	},
	test: {
		include: ['tests/**/*.test.ts'],
		env: { DEV_PORT: String(DEV_PORT) }
	}
});
