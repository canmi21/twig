/* src/routes/api/github/$.ts */

import { createFileRoute } from '@tanstack/react-router'

/** 6 hours in seconds. */
const CACHE_MAX_AGE = 21_600

const GITHUB_API = 'https://api.github.com'

export interface GitHubRepoData {
  name: string
  fullName: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  license: string | null
  updatedAt: string
  openIssues: number
  htmlUrl: string
}

export const Route = createFileRoute('/api/github/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = params._splat
        if (!splat || !/^[\w.-]+\/[\w.-]+$/.test(splat)) {
          return Response.json(
            { error: 'Invalid repo format, expected owner/repo' },
            { status: 400 },
          )
        }

        try {
          const res = await fetch(`${GITHUB_API}/repos/${splat}`, {
            headers: {
              accept: 'application/vnd.github+json',
              'user-agent': 'taki-blog/1.0',
            },
          })

          if (!res.ok) {
            return Response.json(
              { error: `GitHub API returned ${res.status}` },
              { status: res.status },
            )
          }

          const repo = (await res.json()) as Record<string, unknown>

          const data: GitHubRepoData = {
            name: repo.name as string,
            fullName: repo.full_name as string,
            description: (repo.description as string) ?? null,
            language: (repo.language as string) ?? null,
            stars: repo.stargazers_count as number,
            forks: repo.forks_count as number,
            license: (repo.license as Record<string, unknown> | null)
              ?.spdx_id as string | null,
            updatedAt: repo.updated_at as string,
            openIssues: repo.open_issues_count as number,
            htmlUrl: repo.html_url as string,
          }

          return Response.json(data, {
            headers: {
              'cache-control': `public, max-age=${CACHE_MAX_AGE}`,
            },
          })
        } catch {
          return Response.json(
            { error: 'Failed to fetch from GitHub' },
            { status: 502 },
          )
        }
      },
    },
  },
})
