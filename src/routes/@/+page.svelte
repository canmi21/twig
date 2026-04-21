<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="h-full overflow-auto">
	<div class="mx-auto max-w-4xl p-8">
		<h1 class="mb-6 text-xl font-semibold text-foreground">Admin</h1>
		<div class="grid gap-3 sm:grid-cols-2">
			<a
				href={resolve('/@/editor')}
				class="focus-ring flex flex-col gap-1 rounded-lg border border-border bg-background p-5 hover:bg-muted"
			>
				<span class="text-sm font-medium text-foreground">Editor</span>
				<span class="text-xs text-muted-foreground">Write, save, and publish posts.</span>
			</a>
		</div>
	</div>
</div>
