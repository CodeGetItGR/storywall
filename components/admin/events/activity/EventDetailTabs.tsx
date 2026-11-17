'use client';

import { useTranslations } from 'next-intl';

import { type EventDetailTab, formatEventsHash } from '@/lib/adminEvents';
import { cn } from '@/lib/utils';

const TABS: EventDetailTab[] = ['settings', 'activity'];

// Settings and Activity, as plain hash links with the coral indicator under the open one.
export function EventDetailTabs({ eventId, tab }: { eventId: string; tab: EventDetailTab }) {
    const t = useTranslations('AdminPage.events.activity.tabs');
    return (
        <nav aria-label={t('label')} className="flex gap-6 border-b border-border">
            {TABS.map((item) => (
                <a
                    key={item}
                    href={formatEventsHash(eventId, item)}
                    aria-current={item === tab ? 'page' : undefined}
                    className={cn(
                        '-mb-px border-b-2 py-2 text-sm font-semibold transition-colors',
                        item === tab ? 'border-primary text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t(item)}
                </a>
            ))}
        </nav>
    );
}
