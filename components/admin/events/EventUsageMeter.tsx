'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type UsageShare = { key: string; label: string; value: string };

// One limit: what is used in large type, a bar against the limit, then where the limit comes from.
// Shares that add nothing are left out, so a plain plan reads as one line.
export function EventUsageMeter({
    label,
    used,
    limit,
    ratio,
    shares,
    editLabel,
    onEditAction,
}: {
    label: string;
    used: string;
    // null = unlimited.
    limit: string | null;
    ratio: number;
    shares: UsageShare[];
    editLabel: string | null;
    onEditAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.limits');
    const locale = useLocale();
    const tone = ratio >= 1 ? 'bg-status-danger' : ratio >= 0.9 ? 'bg-status-warn' : 'bg-ink-muted';
    // A non-zero share keeps a sliver of fill so it never reads as empty.
    const width = ratio > 0 ? `max(${Math.min(ratio, 1) * 100}%, 3px)` : '0%';

    return (
        <div className="min-w-0">
            {/* Label and edit */}
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{label}</p>
                {editLabel && (
                    <button
                        type="button"
                        onClick={onEditAction}
                        className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                    >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {editLabel}
                    </button>
                )}
            </div>

            {/* Used */}
            <p className="mt-1 font-mono text-2xl font-bold text-ink tabular-nums">
                {used}
                <span className="ml-1.5 text-sm font-medium text-ink-muted">{limit === null ? t('unlimited') : t('ofLimit', { limit })}</span>
            </p>

            {/* Bar */}
            {limit !== null && (
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <div className={cn('h-full rounded-full', tone)} style={{ width }} />
                    </div>
                    <span className="shrink-0 font-mono text-xs text-ink-faint tabular-nums">{formatPercent(locale, ratio)}</span>
                </div>
            )}

            {/* Where the limit comes from */}
            {shares.length > 0 && (
                <dl className="mt-4 space-y-1.5 border-t border-border pt-3">
                    {shares.map((share) => (
                        <div key={share.key} className="flex items-baseline justify-between gap-4 text-sm">
                            <dt className="text-ink-muted">{share.label}</dt>
                            <dd className="font-mono text-[12.5px] font-medium text-ink tabular-nums">{share.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
