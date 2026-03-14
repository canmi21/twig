import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Cloud,
  Database,
  FolderTree,
  PackageCheck,
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { getPlatformStatus } from '~/server/functions/health'

export const Route = createFileRoute('/')({
  loader: () => getPlatformStatus(),
  component: homePage,
})

function homePage() {
  const status = Route.useLoaderData()

  return (
    <section className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground shadow-sm backdrop-blur">
          <PackageCheck className="size-3.5" />
          Full-stack starter ready
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-accent-foreground/80">
            TanStack Start + Cloudflare
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            SSR React on Cloudflare Workers with D1, R2, KV and Drizzle wired in.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The project is trimmed to a clean baseline with TailwindCSS, shadcn,
            lucide icons, file-based routes, and server utilities organized under
            <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 text-sm">src</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a
              href="https://tanstack.com/start/latest/docs/framework/react/quick-start"
              target="_blank"
              rel="noreferrer"
            >
              TanStack Start docs
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a
              href="https://developers.cloudflare.com/workers/"
              target="_blank"
              rel="noreferrer"
            >
              Cloudflare Workers
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: FolderTree,
              title: 'Source layout',
              description: 'src/routes, src/server, src/components and src/lib are ready.',
            },
            {
              icon: Database,
              title: 'Data layer',
              description: 'Drizzle is configured for Cloudflare D1 with a starter schema.',
            },
            {
              icon: Cloud,
              title: 'Bindings',
              description: 'Worker bindings for D1, R2 and KV are declared in wrangler.jsonc.',
            },
            {
              icon: PackageCheck,
              title: 'Runtime split',
              description: 'Bun handles packages while project scripts run through Node.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-border/70 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <item.icon className="mb-4 size-5 text-accent-foreground" />
              <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>

      <aside className="space-y-4 rounded-[2rem] border border-border/70 bg-white/85 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Worker status
          </p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {status.ok ? 'Ready to build' : 'Check bindings'}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Server function executed successfully at {status.generatedAt}.
          </p>
        </div>

        <dl className="space-y-3">
          {[
            ['D1', status.bindings.DB],
            ['R2', status.bindings.ASSETS],
            ['KV', status.bindings.CACHE],
          ].map(([label, ready]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/90 px-4 py-3"
            >
              <dt className="text-sm font-medium text-foreground">{label}</dt>
              <dd
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  ready
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {ready ? 'Bound' : 'Placeholder'}
              </dd>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-100">
          <p className="font-medium text-white">Initialized directories</p>
          <div className="mt-3 space-y-2 font-mono text-xs text-slate-300">
            <div>~/routes</div>
            <div>~/components</div>
            <div>~/lib</div>
            <div>~/server/database</div>
            <div>~/server/functions</div>
          </div>
        </div>
      </aside>
    </section>
  )
}
