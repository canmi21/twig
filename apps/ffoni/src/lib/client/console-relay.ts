import { notifications } from '$lib/notification/state.svelte';

// Bridges console → toasts. The one place that bypasses spec/notifications.md's
// Paraglide rule since library messages aren't translatable.

type Level = 'warn' | 'error';

const DEDUP_WINDOW_MS = 1500;
const MAX_TITLE = 120;
const MAX_BODY = 240;
const seen = new Map<string, number>();

// Drop from toasts; the original console call still runs in devtools.
// Extend when a known-harmless warning starts spamming the stack.
const IGNORE: RegExp[] = [
	/\[vite\]/i,
	/\[HMR\]/i,
	/^\[svelte\]/i,
	// Svelte 5 compile-time dev warning codes (a11y_*, state_*). They
	// fire during hot reload and don't indicate a runtime problem.
	/\bstate_referenced_locally\b/,
	/\ba11y_/,
	// Better Auth emits this at init and repeats it for every reqest.
	/Base URL could not be determined/
];

function safeStringify(v: unknown): string {
	if (v == null) return String(v);
	if (typeof v === 'string') return v;
	if (v instanceof Error) return v.message;
	try {
		return JSON.stringify(v);
	} catch {
		return String(v);
	}
}

function trim(s: string, max: number): string {
	return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function formatArgs(args: unknown[]): { title: string; body?: string } {
	const [first, ...rest] = args;
	const title = trim(safeStringify(first ?? 'Unknown error'), MAX_TITLE);
	const body = rest.length > 0 ? trim(rest.map(safeStringify).join(' '), MAX_BODY) : undefined;
	return { title, body };
}

function relay(level: Level, args: unknown[]) {
	const raw = args.map(safeStringify).join(' ');
	if (IGNORE.some((re) => re.test(raw))) return;

	const { title, body } = formatArgs(args);

	// Dedupe by level+title — noisy libraries fire the same message many
	// times per tick. A 1.5s window is long enough to collapse a burst,
	// short enough that a recurring issue still re-surfaces.
	const key = `${level}:${title}`;
	const now = performance.now();
	const prev = seen.get(key);
	if (prev !== undefined && now - prev < DEDUP_WINDOW_MS) return;
	seen.set(key, now);

	// Guard the push — if rendering the toast itself throws, we must not
	// recurse into our own patched console.error.
	try {
		notifications.push({ title, body, kind: level });
	} catch {
		/* swallow; the original console.* already ran above */
	}
}

let installed = false;

export function installConsoleRelay(): void {
	if (installed) return;
	installed = true;

	const origError = console.error;
	const origWarn = console.warn;

	console.error = (...args: unknown[]) => {
		origError.apply(console, args);
		relay('error', args);
	};
	console.warn = (...args: unknown[]) => {
		origWarn.apply(console, args);
		relay('warn', args);
	};

	window.addEventListener('error', (e) => {
		const where = e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined;
		relay('error', [e.message || 'Script error', where]);
	});

	window.addEventListener('unhandledrejection', (e) => {
		const reason = e.reason instanceof Error ? e.reason.message : safeStringify(e.reason);
		relay('error', ['Unhandled promise rejection', reason]);
	});
}

// Exposed so SvelteKit's handleError hook can fan out to the toast stack
// in addition to whatever error reporter (Sentry, etc) wraps it.
export function relayHandledError(error: unknown, where?: string): void {
	const message = error instanceof Error ? error.message : safeStringify(error);
	relay('error', [message, where]);
}
