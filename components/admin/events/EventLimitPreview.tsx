import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// The limit now and the limit the drawer would leave, side by side, so the effect is read before saving.
// The breakdown spells out the sum, since the field holds only the free part of it.
export function EventLimitPreview({
    current,
    next,
    breakdown,
    warning,
}: {
    current: string;
    next: string | null;
    breakdown: string | null;
    warning: string | null;
}) {
    const t = useTranslations('AdminPage.events');

    return (
        <div className={cn('rounded-lg border p-4', warning ? 'border-status-danger/30 bg-status-danger-wash' : 'border-border bg-canvas')}>
            {/* Now and after */}
            <div className="flex items-center gap-4">
                <div className="min-w-0">
                    <p className="text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">{t('limits.now')}</p>
                    <p className="mt-0.5 font-mono text-lg font-semibold text-ink-muted tabular-nums">{current}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0">
                    <p className="text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">{t('limits.after')}</p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-ink tabular-nums">{next ?? t('noValue')}</p>
                </div>
            </div>

            {/* What the limit is made of */}
            {breakdown && <p className="mt-2 font-mono text-xs text-ink-muted tabular-nums">{breakdown}</p>}

            {/* Why it can't be saved */}
            {warning && <p className="mt-3 text-sm text-status-danger">{warning}</p>}
        </div>
    );
}
