<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import type { Component } from 'svelte';

	type DevUser = { id: string; email: string; isAdmin: boolean } | null;
	let { user }: { user: DevUser } = $props();

	type ToolId = 'auth';
	type Tool = { id: ToolId; label: string; icon: Component };
	const TOOLS: readonly Tool[] = [{ id: 'auth', label: 'Auth', icon: KeyRound }] as const;

	let open = $state(false);
	let active = $state<ToolId>('auth');
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
	const activeLabel = $derived(TOOLS.find((t) => t.id === active)?.label ?? '');
</script>

{#if !open}
	<button
		type="button"
		class="focus-ring fixed top-1/2 left-0 z-999 flex h-12 w-3.5 -translate-y-1/2 items-center justify-center rounded-r-md border-y border-r border-border bg-background text-muted-foreground hover:text-foreground"
		aria-label="Open dev tools"
		onclick={() => (open = true)}
	>
		<ChevronRight class="size-3" />
	</button>
{:else}
	<aside
		class="fixed top-1/2 left-0 z-999 flex h-72 w-64 -translate-y-1/2 rounded-r-lg border-y border-r border-border bg-background shadow-lg"
		aria-label="Dev tools"
	>
		<nav
			class="flex w-9 flex-col items-center justify-between border-r border-divider py-2"
			aria-label="Dev tool categories"
		>
			<div class="flex flex-col gap-1">
				{#each TOOLS as tool (tool.id)}
					{@const Icon = tool.icon}
					<button
						type="button"
						class="focus-ring flex size-7 items-center justify-center rounded-md hover:bg-muted"
						class:bg-muted={active === tool.id}
						class:text-foreground={active === tool.id}
						class:text-muted-foreground={active !== tool.id}
						aria-label={tool.label}
						aria-current={active === tool.id ? 'page' : undefined}
						onclick={() => (active = tool.id)}
					>
						<Icon class="size-3.5" />
					</button>
				{/each}
			</div>
			<button
				type="button"
				class="focus-ring flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Collapse dev tools"
				onclick={() => (open = false)}
			>
				<ChevronLeft class="size-3.5" />
			</button>
		</nav>

		<div class="flex flex-1 flex-col overflow-hidden">
			<header class="border-b border-divider px-3 py-2">
				<span class="text-[10px] tracking-wide text-muted-foreground uppercase">{activeLabel}</span>
			</header>
			<div class="flex-1 overflow-y-auto px-3 py-2">
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
			</div>
		</div>
	</aside>
{/if}
