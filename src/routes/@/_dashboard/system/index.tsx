/* src/routes/@/_dashboard/system/index.tsx */

import { useState } from 'react'
import {
  createFileRoute,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import {
  backupDoToD1,
  fetchBackupStatus,
  resetPresenceSockets,
  restoreDoFromD1,
  wipeDo,
} from '~/server/dashboard'

export const Route = createFileRoute('/@/_dashboard/system/')({
  loader: () => fetchBackupStatus(),
  component: SystemPage,
})

function formatTimestamp(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  })
}

type ActionId = 'reset' | 'backup' | 'restore' | 'wipe'

function SystemPage() {
  const status = Route.useLoaderData()
  const router = useRouter()
  const { siteTimezone } = useRouteContext({ from: '__root__' })
  const [pending, setPending] = useState<ActionId | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const hasBackup = status.count > 0

  async function run(action: ActionId, fn: () => Promise<string>) {
    setPending(action)
    setFeedback(null)
    try {
      const result = await fn()
      setFeedback(result)
      router.invalidate()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setPending(null)
    }
  }

  function handleReset() {
    if (
      !window.confirm(
        'Force-close every live WebSocket? Visitors will reconnect within seconds.',
      )
    ) {
      return
    }
    void run('reset', async () => {
      const { closed } = await resetPresenceSockets()
      return `Closed ${closed} socket${closed === 1 ? '' : 's'}.`
    })
  }

  function handleBackup() {
    if (!window.confirm('Snapshot current DO state into D1?')) return
    void run('backup', async () => {
      const { count: n, updatedAt } = await backupDoToD1()
      return `Saved ${n} keys at ${formatTimestamp(updatedAt, siteTimezone)}.`
    })
  }

  function handleRestore() {
    if (
      !window.confirm(
        'Overwrite current DO state with the last D1 snapshot? Existing keys will be replaced.',
      )
    ) {
      return
    }
    void run('restore', async () => {
      const { restored } = await restoreDoFromD1()
      return restored > 0
        ? `Restored ${restored} keys from D1.`
        : 'No snapshot to restore.'
    })
  }

  function handleWipe() {
    if (
      !window.confirm(
        'Wipe ALL DO persistent state (visit count, geo, tile heat, read counts)? Do a Backup first if you want to recover.',
      )
    ) {
      return
    }
    if (
      !window.confirm('Really wipe? This cannot be undone without a backup.')
    ) {
      return
    }
    void run('wipe', async () => {
      await wipeDo()
      return 'DO wiped. Isolate restart triggered.'
    })
  }

  const sectionClass = 'mt-8 first:mt-0'
  const headingClass =
    'mb-1 text-[13px] font-[620] tracking-[-0.005em] text-primary'
  const descClass = 'mb-3 text-[12px] text-primary opacity-(--opacity-muted)'
  const buttonClass =
    'cursor-pointer rounded-sm border border-border px-3 py-1 text-[12px] text-primary opacity-(--opacity-muted) transition-opacity duration-140 hover:opacity-100 disabled:cursor-wait disabled:opacity-(--opacity-faint)'
  const dangerButtonClass =
    'cursor-pointer rounded-sm border border-border bg-red-500/10 px-3 py-1 text-[12px] text-red-600 transition-opacity duration-140 hover:opacity-100 disabled:cursor-wait disabled:opacity-(--opacity-faint) dark:text-red-400'

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-[17px] font-[560] tracking-[-0.015em] text-primary">
          System
        </h1>
        {feedback && (
          <span className="text-[12px] text-primary opacity-(--opacity-muted)">
            {feedback}
          </span>
        )}
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>Presence</h2>
        <p className={descClass}>
          Drops every live WebSocket and restarts the isolate. Persistent
          storage (visit count, geo, tile heat, read counts) is kept. Use this
          first when the online counter looks wrong.
        </p>
        <button
          type="button"
          disabled={pending === 'reset'}
          onClick={handleReset}
          className={buttonClass}
        >
          {pending === 'reset' ? 'Resetting…' : 'Reset presence'}
        </button>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>DO state backup</h2>
        <p className={descClass}>
          Last snapshot:{' '}
          {status.updatedAt
            ? `${formatTimestamp(status.updatedAt, siteTimezone)} (${status.count} keys)`
            : 'never'}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending === 'backup'}
            onClick={handleBackup}
            className={buttonClass}
          >
            {pending === 'backup' ? 'Backing up…' : 'Backup to D1'}
          </button>
          <button
            type="button"
            disabled={pending === 'restore' || !hasBackup}
            onClick={handleRestore}
            className={buttonClass}
          >
            {pending === 'restore' ? 'Restoring…' : 'Restore from D1'}
          </button>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className={headingClass}>Danger zone</h2>
        <p className={descClass}>
          Deletes every DO persistent key (visit count, geo, tile heat, read
          counts) and forces an isolate restart. Back up to D1 first so you can
          restore afterwards.
        </p>
        <button
          type="button"
          disabled={pending === 'wipe'}
          onClick={handleWipe}
          className={dangerButtonClass}
        >
          {pending === 'wipe' ? 'Wiping…' : 'Full wipe DO'}
        </button>
      </div>
    </div>
  )
}
