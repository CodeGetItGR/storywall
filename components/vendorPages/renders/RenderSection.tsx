import type { ReactNode } from 'react';

import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';

// A section of the vendor page. Same look as VendorMeSection, without its headings: this page keeps its own.
export function RenderSection({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children?: ReactNode }) {
    return (
        <div className={`${VENDOR_SECTION_SURFACE} p-4`}>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[min(100%,14rem)] flex-1">
                    <p className="m-0 text-base font-semibold text-ink">{title}</p>
                    {hint && <p className="m-0 mt-0.5 text-sm leading-snug text-ink-muted">{hint}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            {/* Content */}
            {children && <div className="mt-4 flex flex-col gap-4">{children}</div>}
        </div>
    );
}

// The reach numbers as tiles. Same look as ReachSection's.
export function RenderReachTiles({ tiles }: { tiles: { key: string; label: string; value: string }[] }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {tiles.map(({ key, label, value }) => (
                <div key={key} className="rounded-lg bg-surface-muted px-3.5 py-3">
                    <p className="m-0 text-xs leading-snug text-ink-muted">{label}</p>
                    <p className="m-0 mt-1 text-xl font-bold text-ink tabular-nums">{value}</p>
                </div>
            ))}
        </div>
    );
}
