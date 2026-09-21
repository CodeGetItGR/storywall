'use client';

import { useTranslations } from 'next-intl';

export function PlansPaneEmpty() {
    const t = useTranslations('AdminPage.plans');

    return <p className="px-1 py-6 text-sm text-ink-muted">{t('noEventTypes')}</p>;
}
