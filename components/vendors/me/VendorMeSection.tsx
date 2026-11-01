import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The surface every vendor page section sits on.
export const VENDOR_SECTION_SURFACE = 'rounded-[1.75rem] bg-card shadow-xs ring-1 ring-ink/5';

// One section of the vendor page: a surface with a title, a one-line hint about what the section is for, and its content.
// Every section uses this frame, so the page reads as one set of blocks.
export function VendorMeSection({
    id,
    title,
    hint,
    action,
    icon,
    busy = false,
    children,
    className,
}: {
    id: string;
    title: string;
    hint?: string;
    action?: ReactNode;
    icon?: ReactNode;
    busy?: boolean;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <section aria-labelledby={id} aria-busy={busy || undefined} className={cn(VENDOR_SECTION_SURFACE, 'p-4 sm:p-5', className)}>
            {/* Header */}
            {/* The action drops below the title when the column is too narrow for both. */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-[min(100%,14rem)] flex-1 items-center gap-3">
                    {icon}
                    <div className="min-w-0">
                        <h3 id={id} className="text-base font-semibold text-ink">
                            {title}
                        </h3>
                        {hint && <p className="mt-0.5 text-sm leading-snug text-ink-muted">{hint}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            {/* Content */}
            {children && <div className="mt-4 flex flex-col gap-4">{children}</div>}
        </section>
    );
}
