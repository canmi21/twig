<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<ul class="flex flex-1 flex-col gap-1 p-8 text-sm">
	<li>
		<a
			href={resolve('/dev/notification')}
			class="text-foreground underline hover:text-muted-foreground"
		>
			notification
		</a>
	</li>
</ul>
