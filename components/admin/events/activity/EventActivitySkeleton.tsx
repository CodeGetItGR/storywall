'use client';

import { useTranslations } from 'next-intl';

// Placeholder tiles and chart while the counts load.
export function EventActivitySkeleton() {
    const t = useTranslations('AdminPage.events.activity');
    return (
        <div role="status" aria-label={t('loading')} className="space-y-8">
            {/* Tiles */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-[88px] animate-pulse rounded-xl bg-card" />
                ))}
            </div>
            {/* Chart */}
            <div className="h-56 animate-pulse rounded-xl bg-card" />
        </div>
    );
}
