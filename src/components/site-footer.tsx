/* src/components/site-footer.tsx */

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-chrome/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-8 py-6 text-[12px] text-tertiary">
        <span>&copy; 2023-{new Date().getFullYear()} Canmi</span>
        <a
          href="https://icp.gov.moe/?keyword=20260000"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-secondary"
        >
          萌ICP备20260000号
        </a>
      </div>
    </footer>
  )
}
