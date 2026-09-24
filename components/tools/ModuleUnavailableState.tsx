'use client';

import { AlertCircle, type LucideIcon } from 'lucide-react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';

/** Full-page replacement for a tool whose module the event's plan doesn't include — renders no part of the tool itself. */
export function ModuleUnavailableState({
    backHref,
    backLabel,
    body,
    icon,
    iconClassName,
    title,
}: {
    backHref: string;
    backLabel: string;
    body: string;
    icon: LucideIcon;
    iconClassName: string;
    title: string;
}) {
    return (
        <ModulePageShell
            maxWidth="2xl"
            title={title}
            icon={icon}
            iconClassName={iconClassName}
            showTitleIcon={false}
            backLabel={backLabel}
            backHref={backHref}
        >
            {/* Notice */}
            <div className="mt-8 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink">{title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                    </div>
                </div>
            </div>
        </ModulePageShell>
    );
}
