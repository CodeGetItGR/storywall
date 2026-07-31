import type { ReactNode } from 'react'

export default function Section({
  title, action, children, className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-2">
          {title && <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
