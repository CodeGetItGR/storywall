'use client';

import { useTranslations } from 'next-intl';

import { PageErrorState } from '@/components/ui/PageErrorState';
import { useReportCrash } from '@/hooks/useReportCrash';

export default function MainError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
    const t = useTranslations('PageErrorState.crash');
    useReportCrash(error);

    return <PageErrorState title={t('title')} description={t('description')} onRetryAction={unstable_retry} />;
}
