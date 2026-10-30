'use client';

import { useTranslations } from 'next-intl';

import type { PartnerTierProgressDto } from '@/lib/api/types';
import { tierProgressRatio } from '@/lib/partnerPortal';
import { cn } from '@/lib/utils';

// The partner's commission rate, and how close this year's activations are to the next rate.
export function PartnerTierProgress({ progress, className }: { progress: PartnerTierProgressDto; className?: string }) {
    const t = useTranslations('PartnerPortalPage.tiers');
    const ratio = tierProgressRatio(progress);

    return (
        <div className={className}>
            {/* Current rate */}
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('title')}</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink tabular-nums">{t('percent', { percent: progress.currentPercent })}</p>

            {/* Progress */}
            {ratio !== null && progress.nextTierMinActivations !== null && (
                <div
                    role="progressbar"
                    aria-label={t('progressLabel')}
                    aria-valuemin={0}
                    aria-valuemax={progress.nextTierMinActivations}
                    aria-valuenow={Math.min(progress.activationsThisYear, progress.nextTierMinActivations)}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
                >
                    <div className={cn('h-full rounded-full bg-gradient-brand', ratio === 0 && 'hidden')} style={{ width: `${ratio * 100}%` }} />
                </div>
            )}
            <p className="mt-2 text-sm text-ink-muted">{t('activationsThisYear', { count: progress.activationsThisYear })}</p>
            {progress.nextTierMinActivations !== null && progress.nextTierPercent !== null && (
                <p className="text-sm text-ink-muted">{t('next', { number: progress.nextTierMinActivations, percent: progress.nextTierPercent })}</p>
            )}
        </div>
    );
}
