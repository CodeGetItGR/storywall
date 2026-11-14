'use client';

import { RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// When the numbers were counted, and a way to count again.
export function EventActivityToolbar({
    updatedAt,
    refreshing,
    onRefreshAction,
}: {
    updatedAt: number | null;
    refreshing: boolean;
    onRefreshAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.activity');
    const locale = useLocale();
    return (
        <div className="flex items-center justify-end gap-2 text-xs text-ink-faint">
            {/* Updated */}
            {updatedAt !== null && (
                <span>{t('updatedAt', { time: formatDate(locale, updatedAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) })}</span>
            )}
            {/* Refresh */}
            <button
                type="button"
                onClick={onRefreshAction}
                aria-label={t('refresh')}
                title={t('refresh')}
                className="rounded-md p-1.5 hover:bg-card hover:text-ink"
            >
                <RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
        </div>
    );
}
