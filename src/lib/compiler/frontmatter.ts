/* src/lib/compiler/frontmatter.ts */

import { stringify as stringifyYaml } from 'yaml'
import type { Frontmatter } from './index'

/** Serialize frontmatter to a YAML header block. Omits null/undefined fields. */
export function serializeFrontmatter(fm: Frontmatter): string {
  const obj: Record<string, unknown> = { title: fm.title }

  if (fm.description) obj.description = fm.description
  if (fm.category) obj.category = fm.category
  if (fm.tags && fm.tags.length > 0) obj.tags = fm.tags

  return `---\n${stringifyYaml(obj).trimEnd()}\n---`
}
