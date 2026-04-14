/* src/lib/compiler/slugify.ts */

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      // Keep underscores in the intermediate pass so the next replace can
      // collapse them (and runs of whitespace) into a single hyphen. Dropping
      // them here made `foo_bar` slugify to `foobar` — see slugify.test.ts.
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}
