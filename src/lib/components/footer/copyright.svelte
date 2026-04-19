<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	const copyrightYear = new Date().getFullYear();
</script>

<span class="text-left sm:hidden"
	>{m['footer.copyright.short.prefix']({ year: copyrightYear })}<a
		href="https://ill.li"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">Canmi</a
	>{m['footer.copyright.short.middle']()}<a
		href="https://spdx.org/licenses/AGPL-3.0-or-later"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">AGPLv3</a
	>{m['footer.copyright.short.suffix']()}</span
>
<span class="hidden text-left sm:order-1 sm:inline lg:hidden"
	>{m['footer.copyright.prefix']({ year: copyrightYear })}<a
		href="https://ill.li"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">Canmi</a
	>{m['footer.copyright.short.middle']()}<a
		href="https://spdx.org/licenses/AGPL-3.0-or-later"
		target="_blank"
		rel="noopener noreferrer"
		class="focus-ring hover:text-foreground focus-visible:text-foreground">AGPLv3</a
	>{m['footer.copyright.short.suffix']()}</span
>
<span class="hidden text-left lg:order-1 lg:inline"
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
