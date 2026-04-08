/* src/components/editor/views/shared.tsx */

/* src/components/editor/views/shared.tsx
 *
 * Shared placeholder and selection-ring wrapper used by all
 * directive NodeView components in the editor.
 */

const blockClass =
  'my-4 flex items-center gap-3 rounded-lg border border-border bg-raised px-4 py-3 text-sm text-secondary select-none'

const selectedRing = 'ring-2 ring-accent/40'

export function Placeholder({
  icon,
  label,
  selected,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
}) {
  return (
    <div className={`${blockClass} ${selected ? selectedRing : ''}`}>
      {icon}
      <span className="font-medium text-primary">{label}</span>
    </div>
  )
}

export function SelectedWrap({
  selected,
  children,
}: {
  selected: boolean
  children: React.ReactNode
}) {
  if (!selected) return <>{children}</>
  return <div className="rounded-xl ring-2 ring-accent/40">{children}</div>
}
