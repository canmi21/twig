export function parseTags(raw: string): string[] {
	try {
		return JSON.parse(raw) as string[]
	} catch {
		return []
	}
}

export function parseJson(raw: string): Record<string, unknown> {
	try {
		return JSON.parse(raw) as Record<string, unknown>
	} catch {
		return {}
	}
}

export function generateId(): string {
	return crypto.randomUUID()
}

export function nowIso(): string {
	return new Date().toISOString()
}
