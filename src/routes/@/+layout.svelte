<script lang="ts">
	import IconChevronLeft from '@lucide/svelte/icons/chevron-left';
	import IconChevronRight from '@lucide/svelte/icons/chevron-right';
	import IconFileText from '@lucide/svelte/icons/file-text';
	import IconImage from '@lucide/svelte/icons/image';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// Cookie source of truth — see +layout.server.ts. Initial state is SSR-
	// consistent, so reload doesn't flash the expanded width for one frame.
	let collapsed = $state(untrack(() => data.adminSidebarCollapsed));

	function toggle() {
		collapsed = !collapsed;
		document.cookie = `twig:admin-sidebar=${collapsed ? 'collapsed' : 'expanded'};path=/;max-age=31536000;samesite=lax`;
	}

	const navItems = [
		{ href: '/@/editor', label: 'Editor', icon: IconFileText },
		{ href: '/@/media', label: 'Media', icon: IconImage }
	] as const;
</script>

<div class="flex h-svh">
	<aside
		aria-label="Admin navigation"
		class={[
			'flex shrink-0 flex-col border-r border-divider bg-background transition-[width] duration-200',
			collapsed ? 'w-12' : 'w-48'
		]}
	>
		<div
			class={['flex h-9 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-end pr-2']}
		>
			<button
				type="button"
				onclick={toggle}
				class="focus-ring flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-inset hover:text-foreground"
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				{#if collapsed}
					<IconChevronRight class="size-4" />
				{:else}
					<IconChevronLeft class="size-4" />
				{/if}
			</button>
		</div>

		<ul class="flex flex-1 flex-col gap-1 overflow-auto px-2 py-1">
			{#each navItems as item (item.href)}
				{@const resolved = resolve(item.href)}
				{@const active =
					page.url.pathname === resolved || page.url.pathname.startsWith(resolved + '/')}
				{@const Icon = item.icon}
				<li>
					<a
						href={resolved}
						class={[
							'focus-ring flex items-center gap-3 rounded-md py-2 text-sm',
							active
								? 'bg-inset text-foreground'
								: 'text-muted-foreground hover:bg-inset/50 hover:text-foreground',
							collapsed ? 'justify-center px-0' : 'px-2.5'
						]}
						title={collapsed ? item.label : undefined}
						aria-current={active ? 'page' : undefined}
					>
						<Icon class="size-4 shrink-0" />
						{#if !collapsed}<span>{item.label}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	</aside>

	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
