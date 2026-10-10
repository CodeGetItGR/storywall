'use client';

import { Percent } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { PartnerTierProgressDto } from '@/lib/api/types';

export function PartnerTierProgress({ progress }: { progress: PartnerTierProgressDto }) {
    const t = useTranslations('PartnerPortalPage.tiers');

    return (
        <div className="rounded-lg bg-surface-muted/55 p-4">
            {/* Current rate */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <Percent className="h-4 w-4" aria-hidden="true" />
                {t('title')}
            </div>
            <p className="mt-3 text-3xl font-bold text-ink tabular-nums">{t('percent', { percent: progress.currentPercent })}</p>

            {/* Progress */}
            <p className="mt-1 text-sm text-ink-muted">{t('activationsThisYear', { count: progress.activationsThisYear })}</p>
            {progress.nextTierMinActivations !== null && progress.nextTierPercent !== null && (
                <p className="text-sm text-ink-muted">{t('next', { number: progress.nextTierMinActivations, percent: progress.nextTierPercent })}</p>
            )}
        </div>
    );
}
