'use client';

import { useTranslations } from 'next-intl';

import { ACTIVITY_COLORS, ACTIVITY_KINDS } from '@/lib/adminEventActivity';

// The four series and their colors, shared by the charts.
export function EventActivityLegend() {
    const t = useTranslations('AdminPage.events.activity.series');
    return (
        <ul className="flex flex-wrap gap-4 text-xs text-ink-muted">
            {ACTIVITY_KINDS.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: ACTIVITY_COLORS[kind] }} />
                    {t(kind)}
                </li>
            ))}
        </ul>
    );
}
