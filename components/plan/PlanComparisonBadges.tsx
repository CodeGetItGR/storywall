'use client';

import { Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PlanComparisonBadges({ isCurrent, isNext }: { isCurrent: boolean; isNext: boolean }) {
    const t = useTranslations('EventPlanSettingsPage');

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Check className="h-3 w-3" />
                    {t('compare.current')}
                </span>
            )}
            {isNext && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                    <Sparkles className="h-3 w-3" />
                    {t('compare.next')}
                </span>
            )}
        </div>
    );
}
