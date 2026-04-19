<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	import { m } from '$lib/paraglide/messages';
	import { motion } from '$lib/motion/state.svelte';
	import { notifications } from '$lib/notification/state.svelte';
	import { username } from '$lib/username/state.svelte';
	import { validateUsername } from '$lib/username/validate';

	let editing = $state(false);
	let draft = $state('');
	let kbdEntered = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	const displayName = $derived(username.value ?? m['footer.greeting.stranger']());
	const showWave = $derived(username.value === null);

	function reportInvalid(reason: 'length' | 'chars'): void {
		notifications.push({
			title: m['footer.greeting.invalid.title'](),
			body:
				reason === 'length'
					? m['footer.greeting.invalid.length']()
					: m['footer.greeting.invalid.chars'](),
			kind: 'error'
		});
	}

	$effect(() => {
		if (editing && inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	// Button-activation source detection: `event.detail === 0` means Space/Enter
	// on a focused button (keyboard), > 0 means a real pointer click.
	function enterEdit(event: MouseEvent) {
		kbdEntered = event.detail === 0;
		draft = username.value ?? '';
		editing = true;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const trimmed = draft.trim();
			if (trimmed === '') {
				username.set(null);
				editing = false;
				return;
			}
			const result = validateUsername(trimmed);
			if (!result.ok) {
				reportInvalid(result.reason);
				return;
			}
			username.set(result.value);
			editing = false;
		} else if (e.key === 'Escape') {
			e.preventDefault();
			editing = false;
		}
	}

	// Blur = soft commit: empty clears back to stranger state, valid saves,
	// invalid non-empty silently discards. Enter is the explicit path that
	// surfaces validation errors via the top-right notification toast.
	function handleBlur() {
		const trimmed = draft.trim();
		if (trimmed === '') {
			username.set(null);
		} else {
			const result = validateUsername(trimmed);
			if (result.ok && result.value !== (username.value ?? '')) {
				username.set(result.value);
			}
		}
		editing = false;
	}

	function fadeDuration(): number {
		const pref = motion.value;
		if (pref === 'none') return 0;
		if (pref === 'reduce') return 120;
		return 200;
	}
</script>

<div class="text-xl font-semibold text-foreground">
	<span>{m['footer.greeting.prefix']()}</span>{#if editing}<input
			bind:this={inputEl}
			bind:value={draft}
			onkeydown={handleKey}
			onblur={handleBlur}
			placeholder={m['footer.greeting.placeholder']()}
			autocomplete="off"
			spellcheck="false"
			class="{kbdEntered
				? 'focus-ring'
				: ''} min-w-[4ch] rounded-sm bg-muted px-1.5 py-0 font-[inherit] text-inherit outline-none placeholder:text-muted-foreground"
			style="field-sizing: content"
		/>{:else if showWave}<button
			type="button"
			onclick={enterEdit}
			aria-label={m['footer.greeting.edit']()}
			class="focus-ring cursor-text rounded-sm">{displayName}</button
		>{:else}<button
			type="button"
			onclick={enterEdit}
			aria-label={m['footer.greeting.edit']()}
			class="focus-ring cursor-text rounded-sm underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-current"
			>{displayName}</button
		>{/if}&nbsp;{#if showWave}<Tooltip.Provider delayDuration={300}>
			<Tooltip.Root>
				<Tooltip.Trigger
					onclick={enterEdit}
					aria-label={m['footer.greeting.edit']()}
					class="focus-ring rounded-sm"><span class="greeting-wave">👋</span></Tooltip.Trigger
				>
				<Tooltip.Portal>
					<Tooltip.Content sideOffset={8} forceMount>
						{#snippet child({ wrapperProps, props, open: tipOpen })}
							{#if tipOpen}
								<div {...wrapperProps}>
									<div
										{...props}
										in:fade={{ duration: fadeDuration(), easing: cubicOut }}
										out:fade={{ duration: fadeDuration(), easing: cubicOut }}
										class="z-50 rounded-md border border-border bg-muted px-2 py-1 text-xs font-normal text-foreground shadow-sm"
									>
										{m['footer.greeting.tip']()}
									</div>
								</div>
							{/if}
						{/snippet}
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>{:else}<span>👋</span>{/if}
</div>
