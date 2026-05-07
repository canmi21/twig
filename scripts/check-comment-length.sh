#!/usr/bin/env bash
# Soft warn: flag comment blocks over 3 lines. Never blocks a commit.
# Escape: place a line containing `spec-disable-next-block comments`
# anywhere inside the block (comment syntax of the host language).
# Rule source: spec/comments.md.

set -u

for file in "$@"; do
	[ -f "$file" ] || continue
	case "$file" in
		apps/*/src/lib/paraglide/*) continue ;;
		*.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.svelte|*.css|*.scss|*.html) ;;
		*) continue ;;
	esac

	awk -v FILE="$file" '
		BEGIN {
			LIMIT = 3
			ESC = "spec-disable-next-block comments"
			in_block = ""
			start = 0
			count = 0
			escaped = 0
		}

		function flush() {
			if (count > LIMIT && !escaped) {
				printf "warn: %s:%d-%d comment block is %d lines (> %d) — see spec/comments.md (escape: %s)\n",
					FILE, start, start + count - 1, count, LIMIT, ESC > "/dev/stderr"
			}
			in_block = ""
			count = 0
			escaped = 0
		}

		{
			if (in_block == "c") {
				count++
				if (index($0, ESC) > 0) escaped = 1
				if (index($0, "*/") > 0) flush()
				next
			}
			if (in_block == "h") {
				count++
				if (index($0, ESC) > 0) escaped = 1
				if (index($0, "-->") > 0) flush()
				next
			}

			if (match($0, /^[[:space:]]*\/\//)) {
				if (in_block != "s") { in_block = "s"; start = FNR; count = 0; escaped = 0 }
				count++
				if (index($0, ESC) > 0) escaped = 1
				next
			} else if (in_block == "s") {
				flush()
			}

			if (match($0, /^[[:space:]]*\/\*/)) {
				if (index($0, "*/") == 0) {
					in_block = "c"; start = FNR; count = 1
					escaped = (index($0, ESC) > 0) ? 1 : 0
					next
				}
			}

			if (match($0, /^[[:space:]]*<!--/)) {
				if (index($0, "-->") == 0) {
					in_block = "h"; start = FNR; count = 1
					escaped = (index($0, ESC) > 0) ? 1 : 0
					next
				}
			}
		}

		END { if (in_block != "") flush() }
	' "$file"
done

exit 0
