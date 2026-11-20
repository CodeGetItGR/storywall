'use client';

import { useTranslations } from 'next-intl';

// The chart area when the event has no activity yet.
export function EventActivityEmpty() {
    const t = useTranslations('AdminPage.events.activity');
    return <p className="py-10 text-center text-sm text-ink-muted">{t('empty')}</p>;
}
