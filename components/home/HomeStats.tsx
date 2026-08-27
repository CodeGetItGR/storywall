'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { EventGridItem } from '@/hooks/useEventGridItems';

function HomeStat({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-1 flex-col items-center gap-0.5 py-1">
            <span className="text-lg font-bold tabular-nums text-ink">{value}</span>
            <span className="text-[11px] text-ink-muted">{label}</span>
        </div>
    );
}

export function HomeStats({ items }: { items: EventGridItem[] }) {
    const t = useTranslations('HomePage');
    const [now] = useState(() => Date.now());

    const { hosting, total, upcoming } = useMemo(
        () => ({
            total: items.length,
            hosting: items.filter((item) => item.member.role === 'HOST').length,
            upcoming: items.filter((item) => {
                const startAt = item.event?.schedule.startAt;
                return startAt ? new Date(startAt).getTime() >= now : false;
            }).length,
        }),
        [items, now]
    );

    return (
        <div className="flex items-stretch divide-x divide-border rounded-2xl border border-border bg-card/60">
            <HomeStat value={total} label={t('stats.events')} />
            <HomeStat value={upcoming} label={t('stats.upcoming')} />
            <HomeStat value={hosting} label={t('stats.hosting')} />
        </div>
    );
}
