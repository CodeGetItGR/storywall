'use client';

import { useTranslations } from 'next-intl';

import { ResetDemoButton } from '@/components/demo/ResetDemoButton';

export function DemoBanner({ onResetAction }: { onResetAction: () => void }) {
    const t = useTranslations('Demo');

    return (
        <div role="status" className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-2">
            <p className="text-xs font-semibold text-ink">{t('banner')}</p>
            <ResetDemoButton onResetAction={onResetAction} />
        </div>
    );
}
