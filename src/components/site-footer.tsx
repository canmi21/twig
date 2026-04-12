/* src/components/site-footer.tsx */

import { type CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMap } from '@fortawesome/free-solid-svg-icons'
import { GitMerge, Lollipop } from 'lucide-react'
import { PlanetLine, Rss2Fill, SocialXLine, Train2Fill } from '@mingcute/react'
import { usePresence } from '~/lib/presence'
import { FooterWorldMap } from '~/components/footer-world-map'
import type { SiteFooterData } from '~/server/site-footer-data'

const footerTitleStyle: CSSProperties = {
  fontFamily:
    "'Miranda Sans', 'Roboto', 'Source Sans 3', 'CJK Sans', system-ui, -apple-system, sans-serif",
  fontWeight: 700,
}

function TelegramGlyphIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="180 290 560 470"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <title>Telegram</title>
      <path d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function SitemapIcon({ className }: { className?: string }) {
  return <FontAwesomeIcon icon={faMap} className={className} />
}

function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <title>Bluesky</title>
      <path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026" />
    </svg>
  )
}

function NyaoneIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="280 240 470 550"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <title>Nyaone</title>
      <path d="M292.789 304.042C292.789 277.384 314.432 255.74 341.091 255.74C359.474 255.74 375.473 266.033 383.634 281.165L634.789 587.625L634.789 439.28C626.315 446.624 615.262 451.07 603.179 451.07C576.521 451.07 554.877 429.426 554.877 402.768C554.877 391.367 558.836 380.884 565.452 372.618L565.431 372.601L640.916 280.494C649.184 265.729 664.98 255.74 683.091 255.74C709.749 255.74 731.393 277.384 731.393 304.042L731.393 723.567C731.393 750.225 709.749 771.868 683.091 771.868C665.536 771.868 650.156 762.483 641.699 748.461L389.393 440.596L389.393 723.567C389.393 750.225 367.749 771.868 341.091 771.868C314.432 771.868 292.789 750.225 292.789 723.567L292.789 304.042Z" />
    </svg>
  )
}

const footerLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/canmi21/taki',
    Icon: GitHubIcon,
    scale: 1,
  },
  {
    name: 'X',
    href: 'https://twitter.com/intent/follow?screen_name=canmi21',
    Icon: SocialXLine,
    scale: 1.25,
  },
  {
    name: 'Nyaone',
    href: 'https://nya.one/@canmi',
    Icon: NyaoneIcon,
    scale: 1,
  },
  {
    name: 'Bluesky',
    href: 'https://bsky.app/profile/canmi.net',
    Icon: BlueskyIcon,
    scale: 1,
  },
  {
    name: 'Telegram',
    href: 'https://t.me/canmi21',
    Icon: TelegramGlyphIcon,
    scale: 0.9375,
  },
  {
    name: 'Sitemap',
    href: '/sitemap.xml',
    Icon: SitemapIcon,
    scale: 1,
    newTab: true,
  },
  {
    name: 'Travellings',
    href: 'https://www.travellings.cn/go.html',
    Icon: Train2Fill,
    scale: 1.1875,
  },
  {
    name: 'TravelMoe',
    href: 'https://travel.moe/go?travel=on',
    Icon: PlanetLine,
    scale: 1.1875,
    bold: true,
  },
  {
    name: 'RSS',
    href: '/feed.xml',
    Icon: Rss2Fill,
    scale: 1.125,
  },
] as const

interface SiteFooterProps {
  data: SiteFooterData
  globalPresenceCount?: number
  tileHeat?: Record<string, number>
}

export function SiteFooter({
  data,
  globalPresenceCount,
  tileHeat,
}: SiteFooterProps) {
  if (globalPresenceCount != null) {
    return (
      <SiteFooterContent
        data={data}
        globalPresenceCount={globalPresenceCount}
        tileHeat={tileHeat}
      />
    )
  }

  return <LiveSiteFooter data={data} tileHeat={tileHeat} />
}

function LiveSiteFooter({
  data,
  tileHeat,
}: {
  data: SiteFooterData
  tileHeat?: Record<string, number>
}) {
  const live = usePresence({ initialGlobal: data.presenceCount })
  return (
    <SiteFooterContent
      data={data}
      globalPresenceCount={live.global}
      tileHeat={tileHeat}
    />
  )
}

function SiteFooterContent({
  data,
  globalPresenceCount,
  tileHeat,
}: {
  data: SiteFooterData
  globalPresenceCount: number
  tileHeat?: Record<string, number>
}) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="px-5 py-3">
        <div className="mx-auto flex w-full items-start justify-between gap-6 px-3 sm:px-6">
          <div className="min-w-0 pt-4 text-left text-primary opacity-(--opacity-soft)">
            <div
              className="text-[20px] font-[620] text-primary"
              style={footerTitleStyle}
            >
              Hi, {data.accountName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
              <span>小站已经活了 {data.runtimeDays} 天</span>
              <span>{globalPresenceCount} 位小伙伴正在浏览呢</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-primary opacity-(--opacity-muted)">
              {footerLinks.map((link) => {
                const { name, href, Icon, scale } = link
                const bold = 'bold' in link && link.bold
                const newTab =
                  !href.startsWith('/') || ('newTab' in link && link.newTab)
                return (
                  <a
                    key={name}
                    href={href}
                    target={newTab ? '_blank' : undefined}
                    rel={newTab ? 'noopener noreferrer' : undefined}
                    aria-label={name}
                    className={`inline-flex size-4 shrink-0 items-center justify-center transition-opacity duration-140 hover:opacity-100 [&>svg]:h-(--icon-h)! [&>svg]:w-auto! [&>svg]:flex-none ${bold ? 'footer-icon-bold' : ''}`}
                    style={
                      {
                        '--icon-h': `calc(1rem * ${scale})`,
                      } as CSSProperties
                    }
                  >
                    <Icon />
                  </a>
                )
              })}
            </div>
          </div>
          <div className="hidden flex-col items-end gap-3 text-right text-[14px] text-primary opacity-(--opacity-soft) md:flex">
            <FooterWorldMap
              className="h-[110.25px] w-[378px]"
              initialOffset={data.worldMapOffset}
              latCenter={data.worldMapLatCenter}
              visitorLat={data.visitorLat}
              visitorLon={data.visitorLon}
              tileHeat={tileHeat}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface px-5 pb-3">
        <div className="mx-3 border-t border-dashed border-border sm:mx-6" />
        <div
          className="flex w-full flex-col gap-y-1.5 px-3 pt-3 text-[13px] text-primary opacity-(--opacity-muted) sm:flex-row sm:items-end sm:justify-between sm:px-6"
          style={{ ...footerTitleStyle, fontWeight: 400 }}
        >
          <span className="text-left">
            Copyright © {data.copyrightYear}{' '}
            <a
              href="https://ill.li"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity duration-140 hover:opacity-100"
            >
              Canmi
            </a>
            . Released under the{' '}
            <a
              href="https://spdx.org/licenses/AGPL-3.0-or-later"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity duration-140 hover:opacity-100"
            >
              AGPLv3 License
            </a>
            .
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-left sm:justify-end sm:text-right">
            <span className="relative inline-block">
              <span
                aria-hidden="true"
                className="status-dot-breathe absolute top-1/2 -left-3 size-1.5 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: '#7AC8A7' }}
              />
              <span>All systems normal.</span>
            </span>
            <a
              href="https://icp.gov.moe/?keyword=20260000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-opacity duration-140 hover:opacity-100"
            >
              <Lollipop className="size-[13px]" strokeWidth={2} />
              <span>ICP 20260000</span>
            </a>
            <a
              href={
                __APP_GIT_COMMIT__ === 'dev'
                  ? 'https://github.com/canmi21/taki'
                  : `https://github.com/canmi21/taki/commit/${__APP_GIT_COMMIT__}`
              }
              target="_blank"
              rel="noopener noreferrer"
              title={__APP_GIT_COMMIT__}
              className="inline-flex items-center gap-1 transition-opacity duration-140 hover:opacity-100"
            >
              <GitMerge className="size-[13px]" strokeWidth={2} />
              <span>{__APP_GIT_COMMIT__.slice(0, 7)}</span>
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
