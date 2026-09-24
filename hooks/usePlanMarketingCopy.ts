'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { LandingPlanCopy } from '@/lib/landingPricing';

export function usePlanMarketingCopy() {
    const t = useTranslations('LandingPage.pricing');
    const tModules = useTranslations('Modules');

    const moduleName = useCallback(
        (moduleKey: string) => (tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : moduleKey),
        [tModules],
    );
    const copy = useMemo<LandingPlanCopy>(
        () => ({
            baselineFeatures: t.raw('baselineFeatures') as string[],
            everythingIn: (planName) => t('everythingIn', { plan: planName }),
            guestsUnlimited: t('guestsUnlimited'),
            guestsUpTo: (count) => t('guestsUpTo', { count }),
            mediaUnlimited: t('mediaUnlimited'),
            storageUnlimited: t('storageUnlimited'),
        }),
        [t],
    );

    return { copy, moduleName };
}
