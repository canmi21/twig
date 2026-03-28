/* src/components/site-footer.tsx */

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-chrome/50 backdrop-blur-lg">
      <div className="mx-auto max-w-180 px-5 py-6 text-center text-[12px] text-tertiary">
        <a
          href="https://icp.gov.moe/?keyword=20260000"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-secondary"
        >
          萌ICP备20260000号
        </a>
        {'  '}
        2023-{new Date().getFullYear()} © Canmi
      </div>
    </footer>
  )
}
