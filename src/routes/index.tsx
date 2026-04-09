/* src/routes/index.tsx */

import { useState } from 'react'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import {
  SocialXLine,
  TwitterLine,
  GithubLine,
  TelegramLine,
  MailLine,
  RssLine,
} from '@mingcute/react'
import { Navbar } from '~/components/navbar'
import { usePresence } from '~/lib/presence'
import { getDb, getEmailOwner } from '~/server/platform'
import { user as userTable } from '~/lib/database/auth-schema'

interface OwnerData {
  avatarKey: string
  email: string
}

const getOwner = createServerFn().handler(
  async (): Promise<OwnerData | null> => {
    try {
      const ownerEmail = getEmailOwner()
      const row = await getDb()
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, ownerEmail))
        .get()
      if (!row) return null
      return { avatarKey: `avatar/${row.id}.webp`, email: ownerEmail }
    } catch {
      return null
    }
  },
)

export const Route = createFileRoute('/')({
  loader: () => getOwner(),
  component: HomePage,
})

function OwnerAvatar({ avatarKey }: { avatarKey: string }) {
  const [imgError, setImgError] = useState(false)
  const { cdnPublicUrl } = useRouteContext({ from: '__root__' })
  const prefix = import.meta.env.DEV ? '/api/object' : cdnPublicUrl
  const src = `${prefix}/${avatarKey}`

  return (
    <span className="inline-block size-[65px] shrink-0 overflow-hidden rounded-full border border-border bg-raised">
      {!imgError ? (
        <img
          src={src}
          alt="Canmi"
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="flex size-full items-center justify-center text-[20px] font-[560] text-primary opacity-(--opacity-faint)">
          C
        </span>
      )}
    </span>
  )
}

function HomePage() {
  const owner = Route.useLoaderData()
  const { global } = usePresence()

  return (
    <>
      <Navbar />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-5">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <svg
            className="absolute inset-0 size-full text-tertiary"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="grid-pattern"
                width="72"
                height="72"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 72 0 L 0 0 0 72"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                />
              </pattern>
              <filter
                id="rrect-blur"
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <feGaussianBlur stdDeviation="28" />
              </filter>
              {/* Mask: white = grid visible, black = grid hidden.
                  The inner rect is blurred so its edges fade smoothly. */}
              <mask
                id="rrect-mask"
                maskUnits="userSpaceOnUse"
                maskContentUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="100%"
                height="100%"
              >
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x="50%"
                  y="120"
                  width="1200"
                  height="460"
                  rx="80"
                  ry="80"
                  transform="translate(-600 0)"
                  fill="black"
                  filter="url(#rrect-blur)"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#grid-pattern)"
              mask="url(#rrect-mask)"
            />
          </svg>
        </div>
        <div className="w-full max-w-180 px-7 py-6">
          {/* Header: avatar + name/handle */}
          <div className="flex items-center gap-4">
            {owner && <OwnerAvatar avatarKey={owner.avatarKey} />}
            <div className="min-w-0">
              <div className="text-[24px] font-[560] text-primary">Canmi</div>
              <div className="text-[13px] text-primary opacity-(--opacity-muted)">
                @canmi21
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="mt-5">
            <div className="text-[14px] text-primary opacity-(--opacity-muted)">
              初めまして
            </div>
            <span className="mt-1 text-[15px] text-primary opacity-(--opacity-soft)">
              /ˈkæ.mi/
            </span>
            <span className="ml-3 text-[13px] text-primary opacity-(--opacity-muted)">
              silent "n" pls!
            </span>
            <div className="mt-1 text-[13px] text-primary opacity-(--opacity-muted)">
              ENTP / (INFJ?)
            </div>

            {/* Social links — icons and borders are fixed white; brand bg does not follow theme */}
            <div className="mt-4 flex items-center gap-2.5">
              <a
                href="https://twitter.com/intent/follow?screen_name=canmi21"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex size-8 items-center justify-center rounded-full border border-transparent bg-black transition-opacity duration-140 hover:opacity-80"
                style={{ color: 'white' }}
              >
                <SocialXLine className="absolute size-[18px] transition-opacity duration-140 group-hover:opacity-0" />
                <TwitterLine className="absolute size-[18px] opacity-0 transition-opacity duration-140 group-hover:opacity-100" />
              </a>
              {[
                {
                  Icon: GithubLine,
                  href: 'https://github.com/canmi21',
                  bg: '#24292F',
                },
                {
                  Icon: TelegramLine,
                  href: 'https://t.me/canmi21',
                  bg: '#26A5E4',
                },
                {
                  Icon: MailLine,
                  href: owner ? `mailto:${owner.email}` : '#',
                  bg: '#F2A93C',
                },
                {
                  Icon: RssLine,
                  href: '/feed.xml',
                  bg: '#C45140',
                },
              ].map(({ Icon, href, bg }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith('/') ? undefined : '_blank'}
                  rel={href.startsWith('/') ? undefined : 'noopener noreferrer'}
                  className="flex size-8 items-center justify-center rounded-full border border-transparent transition-opacity duration-140 hover:opacity-80"
                  style={{ backgroundColor: bg, color: 'white' }}
                >
                  <Icon className="size-[18px]" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[12px] text-primary opacity-(--opacity-faint)">
          <a
            href="https://icp.gov.moe/?keyword=20260000"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity duration-140 hover:opacity-100"
          >
            萌ICP备20260000号
          </a>
          {'  '}
          2023-{new Date().getFullYear()} © Canmi
          {global > 0 && <span className="ml-2">{global} online</span>}
        </p>
      </div>
    </>
  )
}
