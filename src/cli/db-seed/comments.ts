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
  userAgent?: string
  location?: string
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
  //     I (bob)        - reply to C (location only)
  // E (bob)            - top level
  // J (charlie)        - top level, device/location rich
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
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        location: 'Singapore Singapore',
      },
    },
    {
      key: 'B',
      parentKey: 'A',
      comment: {
        userId: users.bob,
        content: 'Twelve steps sounds painful. What did you end up cutting?',
        status: 'approved',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        location: 'Japan Tokyo',
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
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
        location: '',
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
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
        location: 'Korea Seoul',
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
        userAgent: '',
        location: '',
      },
    },
    {
      key: 'I',
      parentKey: 'C',
      comment: {
        userId: users.bob,
        content:
          'Same here. I usually keep one external service per feature as a rough limit before I stop and rethink the design.',
        status: 'approved',
        userAgent: '',
        location: 'China Shanghai',
      },
    },
    {
      key: 'E',
      comment: {
        userId: users.bob,
        content:
          'Good read. The bit about Bun replacing three tools is real — I dropped node, tsx, and jest in one go.',
        status: 'approved',
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36',
        location: 'Canada Vancouver',
      },
    },
    {
      key: 'J',
      comment: {
        userId: users.charlie,
        content:
          'There is also a team cost here. Every extra tool becomes one more thing new contributors have to learn before they can even send a patch.',
        status: 'approved',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        location: 'US Seattle',
      },
    },
    {
      key: 'G',
      comment: {
        userId: users.alice,
        content:
          'Would love a follow-up on how you handle type checking in this minimal setup.',
        status: 'pending',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        location: 'Germany Berlin',
      },
    },
    {
      key: 'H',
      comment: {
        userId: users.charlie,
        content: 'First!',
        status: 'rejected',
        userAgent: '',
        location: '',
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
      userAgent: entry.comment.userAgent ?? '',
      location: entry.comment.location ?? '',
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
