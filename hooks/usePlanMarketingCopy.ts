'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { LandingPlanCopy } from '@/lib/landingPricing';

export function usePlanMarketingCopy() {
    const t = useTranslations('LandingPage.pricing');
    const tModules = useTranslations('Modules');
    const localizedText = useLocalizedText();

    const moduleName = useCallback(
        (moduleKey: string) => (tModules.has(`${moduleKey}.name`) ? tModules(`${moduleKey}.name`) : moduleKey),
        [tModules],
    );
    const copy = useMemo<LandingPlanCopy>(
        () => ({
            coHosts: (max) => (max === null ? t('coHostsUnlimited') : t('coHosts', { count: max })),
            everythingIn: (planName) => t('everythingIn', { plan: planName }),
            guestsUnlimited: t('guestsUnlimited'),
            guestsUpTo: (count) => t('guestsUpTo', { count }),
            mediaUnlimited: t('mediaUnlimited'),
            memberRoles: (count, custom, examples) => {
                // "Best man, Bridesmaid…": the ellipsis says there are more than the names shown.
                const roles = examples.map((label) => localizedText(label)).join(', ') + (count > examples.length ? '…' : '');
                return t(custom ? 'memberRolesWithCustom' : 'memberRoles', { count, roles });
            },
            memberRolesCustomOnly: t('memberRolesCustomOnly'),
            moduleWithDetail: (label, detail) => t('moduleWithDetail', { label, detail }),
            qrUpload: t('qrUpload'),
            scheduleSessions: (max) => (max === null ? t('scheduleSessionsUnlimited') : t('scheduleSessions', { count: max })),
            storageUnlimited: t('storageUnlimited'),
        }),
        [localizedText, t],
    );

    return { copy, moduleName };
}
