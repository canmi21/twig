/* src/routes/index.tsx */

import { useState, type CSSProperties } from 'react'
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

const GRID_TILE = 80
// Grid line crossing sits at the tile center so a single tile can draw one
// full "+" crosshair without relying on neighbors (which previously caused
// overlapping strokes and doubled-thickness artifacts).
const GRID_CENTER = GRID_TILE / 2
const GRID_CROSSHAIR_ARM = 3
const GRID_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID_TILE}" height="${GRID_TILE}" viewBox="0 0 ${GRID_TILE} ${GRID_TILE}" fill="none"><path d="M 0 ${GRID_CENTER} L ${GRID_TILE} ${GRID_CENTER} M ${GRID_CENTER} 0 L ${GRID_CENTER} ${GRID_TILE}" stroke="black" stroke-width="1.5" stroke-dasharray="3 4"/><path d="M ${GRID_CENTER - GRID_CROSSHAIR_ARM} ${GRID_CENTER} L ${GRID_CENTER + GRID_CROSSHAIR_ARM} ${GRID_CENTER} M ${GRID_CENTER} ${GRID_CENTER - GRID_CROSSHAIR_ARM} L ${GRID_CENTER} ${GRID_CENTER + GRID_CROSSHAIR_ARM}" stroke="black" stroke-width="1.5"/></svg>`,
)}")`
const GRID_MASK_POSITION = `calc(50vw - ${GRID_CENTER}px) calc(50vh - ${GRID_CENTER}px)`
const gridMaskStyle: CSSProperties = {
  backgroundColor: 'var(--color-border)',
  WebkitMaskImage: GRID_MASK_IMAGE,
  maskImage: GRID_MASK_IMAGE,
  WebkitMaskPosition: GRID_MASK_POSITION,
  maskPosition: GRID_MASK_POSITION,
  WebkitMaskSize: `${GRID_TILE}px ${GRID_TILE}px`,
  maskSize: `${GRID_TILE}px ${GRID_TILE}px`,
  WebkitMaskRepeat: 'repeat',
  maskRepeat: 'repeat',
}
const gridVeilStyle: CSSProperties = {
  left: '50%',
  top: '120px',
  width: '1200px',
  height: '460px',
  borderRadius: '80px',
  backgroundColor: 'var(--color-surface)',
  filter: 'blur(28px)',
  transform: 'translateX(-50%)',
}

function HomePage() {
  const owner = Route.useLoaderData()
  const { global } = usePresence()

  return (
    <>
      <Navbar />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-5">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0" style={gridMaskStyle} />
          <div className="absolute" style={gridVeilStyle} />
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
