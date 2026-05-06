<script lang="ts">
	import WindowCard from './window-card.svelte';

	interface Props {
		label: string;
		active?: boolean;
		buttonProps?: Record<string, unknown>;
		colors: {
			bg: string;
			titlebar: string;
			dot: string;
			sidebar: string;
			title: string;
			body: string;
			border: string;
			borderHover: string;
		};
	}

	let { label, active = false, buttonProps, colors: c }: Props = $props();
</script>

<WindowCard
	{label}
	{active}
	{buttonProps}
	bg={c.bg}
	titlebar={c.titlebar}
	dot={c.dot}
	border={c.border}
	borderHover={c.borderHover}
>
	<div class="flex h-full gap-2.5">
		<div class="w-5 shrink-0 space-y-1">
			<div class="h-1 w-full rounded-sm" style:background={c.sidebar}></div>
			<div class="h-1 w-3/5 rounded-sm" style:background={c.sidebar}></div>
			<div class="h-1 w-4/5 rounded-sm" style:background={c.sidebar}></div>
		</div>
		<div class="flex-1 space-y-1">
			<div class="h-1.5 w-2/5 rounded-sm" style:background={c.title}></div>
			<div class="h-1 w-3/4 rounded-sm" style:background={c.body}></div>
			<div class="h-1 w-1/2 rounded-sm" style:background={c.body}></div>
			<div class="h-1 w-2/3 rounded-sm" style:background={c.body}></div>
		</div>
	</div>
</WindowCard>
