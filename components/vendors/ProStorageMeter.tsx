'use client';

import { useTranslations } from 'next-intl';

import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { proStorageState } from '@/lib/vendors';

// The Pro album allowance. Going over is normal (the rest counts as event storage), so the bar never turns red.
export function ProStorageMeter({ usedBytes, allowanceBytes, className }: { usedBytes: number; allowanceBytes: number; className?: string }) {
    const t = useTranslations('Vendors.meter');
    const { state, percent, overflowBytes } = proStorageState(usedBytes, allowanceBytes);
    // An empty album shows an empty bar, also when the allowance is 0.
    const fill = usedBytes > 0 ? percent : 0;

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {/* Figures */}
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-ink">{t('label')}</span>
                <span className="text-ink-muted">{t('value', { used: formatBytes(usedBytes), total: formatBytes(allowanceBytes) })}</span>
            </div>

            {/* Bar */}
            <div
                role="meter"
                aria-label={t('label')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={fill}
                className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
            >
                <div className="h-full rounded-full bg-ink" style={{ width: `${fill}%` }} />
            </div>

            {/* Overflow */}
            {state === 'over' && <p className="text-xs text-ink-muted">{t('over', { over: formatBytes(overflowBytes) })}</p>}
        </div>
    );
}
