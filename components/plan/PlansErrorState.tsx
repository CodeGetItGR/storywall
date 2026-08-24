'use client';

import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';

export function PlansErrorState({ onRetryAction }: { onRetryAction?: () => void }) {
    const t = useTranslations('PageErrorState.plans');
    const tBase = useTranslations('PageErrorState');

    return <PageErrorState title={t('title')} description={t('description')} onRetryAction={onRetryAction} retryLabel={tBase('retry')} />;
}
