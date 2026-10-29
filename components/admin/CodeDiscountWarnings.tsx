'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { CodeDiscountWarnings as Warnings } from '@/hooks/useCodeDiscountWarnings';

export function CodeDiscountWarnings({ warnings }: { warnings: Warnings }) {
    const t = useTranslations('AdminPage.collaborations.codes.warnings');
    if (!warnings.isHigh && warnings.belowMinimumPlanNames.length === 0) return null;

    return (
        <ul className="space-y-1 text-sm leading-5 text-status-warn" aria-live="polite">
            {warnings.isHigh && (
                <li className="flex gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('high')}
                </li>
            )}
            {warnings.belowMinimumPlanNames.length > 0 && (
                <li className="flex gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('belowMinimum', { plans: warnings.belowMinimumPlanNames.join(', ') })}
                </li>
            )}
        </ul>
    );
}
