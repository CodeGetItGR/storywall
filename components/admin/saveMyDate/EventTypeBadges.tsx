'use client';

import { useTranslations } from 'next-intl';

const BADGE = 'rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-ink-muted';

// A table cell's event types. An empty list is offered to every type and says so.
export function EventTypeBadges({ eventTypes, labelOf }: { eventTypes: readonly string[]; labelOf: (key: string) => string }) {
    const t = useTranslations('AdminPage.saveMyDate');

    if (eventTypes.length === 0) return <span className={BADGE}>{t('eventTypesAll')}</span>;
    return (
        <span className="flex flex-wrap gap-1">
            {eventTypes.map((key) => (
                <span key={key} className={BADGE}>
                    {labelOf(key)}
                </span>
            ))}
        </span>
    );
}
