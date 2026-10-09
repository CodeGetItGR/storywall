'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { AdminEventModuleConfig } from '@/lib/api/types';

// A setting's value as text: a cap's number or Unlimited, a flag's On or Off (absent counts as off).
export function useModuleConfigValue() {
    const t = useTranslations('AdminPage.plans.grid.cell');
    const locale = useLocale();

    return useCallback(
        (kind: AdminEventModuleConfig['kind'], value: AdminEventModuleConfig['effectiveValue']) => {
            if (kind === 'FLAG') return value === true ? t('on') : t('off');
            return typeof value === 'number' ? value.toLocaleString(locale) : t('unlimited');
        },
        [t, locale],
    );
}
