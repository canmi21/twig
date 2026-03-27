/* src/lib/prettier/html-source-formatter.ts */

const FORMAT_OPTIONS = {
  parser: 'html',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
} as const

export async function formatHtmlSource(code: string): Promise<string> {
  const [{ format }, htmlPlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/html'),
  ])

  return format(code, {
    ...FORMAT_OPTIONS,
    plugins: [htmlPlugin],
  })
}
