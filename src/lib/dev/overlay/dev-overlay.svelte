<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import DevDock, { type DevDockTool } from '$lib/dev/dock/dev-dock.svelte';

	type DevUser = { id: string; email: string; isAdmin: boolean } | null;
	let { user }: { user: DevUser } = $props();

	const TOOLS: readonly DevDockTool[] = [{ id: 'auth', label: 'Auth', icon: KeyRound }] as const;

	let busy = $state(false);

	async function flip(as: 'admin' | 'user' | 'none') {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch(`/dev/api/auth/switch?as=${as}`, { method: 'POST' });
			if (!res.ok) {
				console.error('[dev-overlay] switch failed', res.status, await res.text());
				return;
			}
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	const stateLabel = $derived(
		user ? `${user.email}${user.isAdmin ? ' · admin' : ' · user'}` : 'signed out'
	);
</script>

<DevDock tools={TOOLS}>
	{#snippet panel(active: string)}
		{#if active === 'auth'}
			<div class="flex flex-col gap-2">
				<div class="truncate font-mono text-[11px] text-foreground/72" title={stateLabel}>
					{stateLabel}
				</div>
				<div class="flex flex-col gap-1">
					<button
						type="button"
						disabled={busy}
						class="focus-ring rounded-md border border-border px-2 py-1 text-left text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
						onclick={() => flip('admin')}
					>
						Login as admin
					</button>
					<button
						type="button"
						disabled={busy}
						class="focus-ring rounded-md border border-border px-2 py-1 text-left text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
						onclick={() => flip('user')}
					>
						Login as user
					</button>
					<button
						type="button"
						disabled={busy}
						class="focus-ring rounded-md border border-border px-2 py-1 text-left text-[11px] text-foreground hover:bg-muted disabled:opacity-50"
						onclick={() => flip('none')}
					>
						Sign out
					</button>
				</div>
			</div>
		{/if}
	{/snippet}
</DevDock>
