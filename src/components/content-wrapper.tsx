/* src/components/content-wrapper.tsx */

import type { ReactNode } from 'react'

export function ContentWrapper({ children }: { children: ReactNode }) {
	return <main className="mx-auto w-full max-w-4xl px-5 pt-20 pb-8 sm:pt-24">{children}</main>
}