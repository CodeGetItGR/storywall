'use client';

import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';

// For an account with no vendor profile and no vendor rows.
export function BusinessNotVendor() {
    const t = useTranslations('BusinessPage.notVendor');

    return <PageErrorState title={t('title')} description={t('description')} />;
}
