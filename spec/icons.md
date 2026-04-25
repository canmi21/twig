# Icons

- **Custom SVGs:** `src/lib/icons/*.svelte`, one per file, `class` prop + `fill="currentColor"` + `<title>`, no hard-coded size.
- **Lucide:** `@lucide/svelte/icons/<kebab-name>` (per-icon import).
- **FontAwesome:** `svelte-fa` + `@fortawesome/free-solid-svg-icons`.
- **Mingcute / any Iconify collection:** `unplugin-icons` + `@iconify-json/<collection>`, imported as `~icons/<collection>/<icon-name>`.
