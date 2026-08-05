'use client';

import { useTranslations } from 'next-intl';

interface ScheduleEmptyStateProps {
    isHost: boolean;
    t: ReturnType<typeof useTranslations>;
}

export function ScheduleEmptyState({ isHost, t }: ScheduleEmptyStateProps) {
    return (
        <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-6 shadow-sm">
            <p className="text-sm font-semibold text-ink">{isHost ? t('host.emptyTitle') : t('guest.emptyTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{isHost ? t('host.emptyBody') : t('guest.emptyBody')}</p>
        </div>
    );
}
