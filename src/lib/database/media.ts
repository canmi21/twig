/* src/lib/database/media.ts */

import { eq, and } from 'drizzle-orm'
import type { Db } from './index'
import { media, mediaRefs } from './schema'

export interface MediaRow {
  hash: string
  ext: string
  mime: string
  size: number
  createdAt: string
}

export async function getMediaByHash(
  db: Db,
  hash: string,
): Promise<MediaRow | undefined> {
  return db.select().from(media).where(eq(media.hash, hash)).get()
}

export async function insertMedia(db: Db, row: MediaRow): Promise<void> {
  await db.insert(media).values(row)
}

export async function upsertMediaRef(
  db: Db,
  hash: string,
  cid: string,
): Promise<void> {
  const existing = await db
    .select()
    .from(mediaRefs)
    .where(and(eq(mediaRefs.hash, hash), eq(mediaRefs.cid, cid)))
    .get()

  if (!existing) {
    await db.insert(mediaRefs).values({ hash, cid })
  }
}

export async function getMediaForPost(
  db: Db,
  cid: string,
): Promise<MediaRow[]> {
  return db
    .select({
      hash: media.hash,
      ext: media.ext,
      mime: media.mime,
      size: media.size,
      createdAt: media.createdAt,
    })
    .from(mediaRefs)
    .innerJoin(media, eq(mediaRefs.hash, media.hash))
    .where(eq(mediaRefs.cid, cid))
    .all()
}
