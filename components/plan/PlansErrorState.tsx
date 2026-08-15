'use client';

import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';

export function PlansErrorState({ onRetry }: { onRetry?: () => void }) {
    const t = useTranslations('PageErrorState.plans');
    const tBase = useTranslations('PageErrorState');

    return <PageErrorState title={t('title')} description={t('description')} onRetry={onRetry} retryLabel={tBase('retry')} />;
}
