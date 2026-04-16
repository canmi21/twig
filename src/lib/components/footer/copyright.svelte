<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const copyrightYear = new Date().getFullYear();
</script>

<span class="text-left"
	>{m['footer.copyright.prefix']({ year: copyrightYear })}<a
		href="https://ill.li"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">Canmi</a
	>{m['footer.copyright.middle']()}<a
		href="https://spdx.org/licenses/AGPL-3.0-or-later"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">AGPLv3</a
	>{m['footer.copyright.suffix']()}</span
>
