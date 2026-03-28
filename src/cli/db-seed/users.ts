/* src/cli/db-seed/users.ts */

import type { SeedContext } from './index'

export interface SeededUsers {
  admin: string
  alice: string
  bob: string
  charlie: string
}

const USERS = [
  {
    id: 'dev-user-admin',
    name: 'Admin',
    email: 'admin@dev.local',
    role: 'admin',
  },
  { id: 'dev-user-alice', name: 'Alice', email: 'alice@dev.local', role: null },
  { id: 'dev-user-bob', name: 'Bob', email: 'bob@dev.local', role: null },
  {
    id: 'dev-user-charlie',
    name: 'Charlie',
    email: 'charlie@dev.local',
    role: null,
  },
] as const

export async function seedUsers(ctx: SeedContext): Promise<SeededUsers> {
  for (const u of USERS) {
    await ctx.d1
      .prepare(
        `INSERT OR IGNORE INTO user (id, name, email, email_verified, role)
         VALUES (?, ?, ?, 1, ?)`,
      )
      .bind(u.id, u.name, u.email, u.role)
      .run()
  }

  console.log(`  ${USERS.length} users`)
  return {
    admin: USERS[0].id,
    alice: USERS[1].id,
    bob: USERS[2].id,
    charlie: USERS[3].id,
  }
}
