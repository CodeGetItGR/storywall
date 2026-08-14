'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';

export function useLocalizedPlanDescription() {
    const locale = useLocale();
    const t = useTranslations('PlanDescriptions');

    return useCallback(
        (plan: Pick<PlanTierResponseDto, 'code' | 'description' | 'name'>) => {
            if (t.has(plan.code)) return t(plan.code);
            if (locale === 'en' && plan.description?.trim()) return plan.description.trim();
            return t('fallback', { plan: plan.name });
        },
        [locale, t]
    );
}
