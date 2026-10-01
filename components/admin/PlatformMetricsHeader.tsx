'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function PlatformMetricsHeader({
    updatedAt,
    isFetching,
    onRefreshAction,
}: {
    updatedAt: string | null;
    isFetching: boolean;
    onRefreshAction: () => void;
}) {
    const t = useTranslations('AdminPage.metrics');

    return (
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
            <div className="flex items-center gap-3">
                {updatedAt && <span className="text-xs text-ink-faint">{t('updatedAt', { time: updatedAt })}</span>}
                <button
                    type="button"
                    onClick={onRefreshAction}
                    disabled={isFetching}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-ink-muted transition hover:border-ink-faint hover:bg-surface-muted disabled:opacity-50"
                >
                    <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
                    {t('refresh')}
                </button>
            </div>
        </header>
    );
}
