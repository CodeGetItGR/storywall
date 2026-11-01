'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ToolEmptyState } from '@/components/tools/ToolEmptyState';

// The overview failed for a reason other than "not a vendor": a short note and a retry.
export function BusinessLoadFailed({ onRetryAction }: { onRetryAction: () => void }) {
    const t = useTranslations('BusinessPage.unavailable');

    return (
        <ToolEmptyState
            title={t('title')}
            body={t('body')}
            icon={CloudOff}
            action={
                <button
                    type="button"
                    onClick={onRetryAction}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t('retry')}
                </button>
            }
        />
    );
}
