/* src/cli/db-seed/comments.ts */

import { createComment, updateCommentStatus } from '../../lib/database/comments'
import type { SeedContext } from './index'
import type { SeededUsers } from './users'
import type { SeededPosts } from './posts'

interface SeedComment {
  userId: string
  content: string
  parentId?: string
  status: 'approved' | 'pending' | 'rejected'
}

export async function seedComments(
  ctx: SeedContext,
  users: SeededUsers,
  posts: SeededPosts,
): Promise<void> {
  const postCid = posts.published

  // Define comment tree structure:
  // A (alice)          - top level
  //   B (bob)          - reply to A
  //     D (alice)      - reply to B (deep chain)
  //       F (charlie)  - reply to D (deeper)
  //   C (charlie)      - reply to A (second branch)
  // E (bob)            - top level
  // G (alice)          - top level, pending
  // H (charlie)        - top level, rejected

  const tree: { key: string; comment: SeedComment; parentKey?: string }[] = [
    {
      key: 'A',
      comment: {
        userId: users.alice,
        content:
          'This resonates. I went through the same thing with our CI pipeline — we had twelve steps that could have been three.',
        status: 'approved',
      },
    },
    {
      key: 'B',
      parentKey: 'A',
      comment: {
        userId: users.bob,
        content: 'Twelve steps sounds painful. What did you end up cutting?',
        status: 'approved',
      },
    },
    {
      key: 'D',
      parentKey: 'B',
      comment: {
        userId: users.alice,
        content:
          'Most of the caching layers and a duplicate lint pass. Turns out the bundler already caught what the linter was checking for.',
        status: 'approved',
      },
    },
    {
      key: 'F',
      parentKey: 'D',
      comment: {
        userId: users.charlie,
        content:
          'That duplicate lint thing is more common than people think. We had the same issue with ESLint and oxlint overlapping.',
        status: 'approved',
      },
    },
    {
      key: 'C',
      parentKey: 'A',
      comment: {
        userId: users.charlie,
        content:
          'The "ten lines of code" heuristic is a good one. I use a similar rule: if the dependency README is longer than my feature, I write it myself.',
        status: 'approved',
      },
    },
    {
      key: 'E',
      comment: {
        userId: users.bob,
        content:
          'Good read. The bit about Bun replacing three tools is real — I dropped node, tsx, and jest in one go.',
        status: 'approved',
      },
    },
    {
      key: 'G',
      comment: {
        userId: users.alice,
        content:
          'Would love a follow-up on how you handle type checking in this minimal setup.',
        status: 'pending',
      },
    },
    {
      key: 'H',
      comment: {
        userId: users.charlie,
        content: 'First!',
        status: 'rejected',
      },
    },
  ]

  // Insert in order, building ID map
  const idMap = new Map<string, string>()

  for (const entry of tree) {
    const parentId = entry.parentKey ? idMap.get(entry.parentKey) : undefined

    const id = await createComment(ctx.db, {
      postCid,
      userId: entry.comment.userId,
      content: entry.comment.content,
      parentId: parentId ?? null,
    })

    // Set status (createComment defaults to 'pending')
    if (entry.comment.status !== 'pending') {
      await updateCommentStatus(ctx.db, id, entry.comment.status)
    }

    idMap.set(entry.key, id)
  }

  const approved = tree.filter((t) => t.comment.status === 'approved').length
  const pending = tree.filter((t) => t.comment.status === 'pending').length
  const rejected = tree.filter((t) => t.comment.status === 'rejected').length
  console.log(
    `  ${tree.length} comments (${approved} approved, ${pending} pending, ${rejected} rejected)`,
  )
}
