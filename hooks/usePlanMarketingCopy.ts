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
            coHosts: (max) => (max === null ? t('coHostsUnlimited') : t('coHosts', { count: max })),
            everythingIn: (planName) => t('everythingIn', { plan: planName }),
            galleryWithQrUpload: t('galleryWithQrUpload'),
            guestsUnlimited: t('guestsUnlimited'),
            guestsUpTo: (count) => t('guestsUpTo', { count }),
            mediaUnlimited: t('mediaUnlimited'),
            scheduleSessions: (max) => (max === null ? t('scheduleSessionsUnlimited') : t('scheduleSessions', { count: max })),
            storageUnlimited: t('storageUnlimited'),
        }),
        [t],
    );

    return { copy, moduleName };
}
