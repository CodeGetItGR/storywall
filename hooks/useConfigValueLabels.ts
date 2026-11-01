'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { ConfigValueLabels } from '@/lib/planModuleConfig';

// The words module settings are shown in, for describeConfigValue and the lists built on it.
export function useConfigValueLabels(): ConfigValueLabels {
    const t = useTranslations('AdminPage');

    return useMemo(
        () => ({
            field: (key: string) => t(`plans.grid.cell.fields.${key}`),
            unlimited: t('plans.grid.cell.unlimited'),
            upTo: (count: number | string) => t('plans.grid.cell.upToValue', { count }),
            on: t('plans.grid.cell.on'),
            off: t('plans.grid.cell.off'),
            none: t('none'),
            type: (role) => t(`collaborations.feedCard.roles.${role}`),
            allTypes: t('plans.grid.cell.allTypes'),
            typeCount: (count: number, total: number) => t('plans.grid.cell.typeCount', { count, total }),
        }),
        [t],
    );
}
