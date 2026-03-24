/* src/lib/compiler/frontmatter.ts */

import { stringify as stringifyYaml } from 'yaml'
import type { Frontmatter } from './index'

/** Serialize frontmatter to a YAML header block. Omits null/undefined fields. */
export function serializeFrontmatter(fm: Frontmatter): string {
  const obj: Record<string, unknown> = {}

  // cid first
  if (fm.cid) obj.cid = fm.cid

  // core content fields
  obj.title = fm.title
  if (fm.description) obj.description = fm.description
  if (fm.category) obj.category = fm.category
  if (fm.tags && fm.tags.length > 0) obj.tags = fm.tags

  // metadata fields last
  if (fm.created_at) obj.created_at = fm.created_at
  if (fm.updated_at) obj.updated_at = fm.updated_at
  if (fm.published !== undefined) obj.published = fm.published

  return `---\n${stringifyYaml(obj).trimEnd()}\n---`
}
