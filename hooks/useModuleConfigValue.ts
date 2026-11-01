'use client';

import { useLocale } from 'next-intl';
import { useCallback } from 'react';

import { useConfigValueLabels } from '@/hooks/useConfigValueLabels';
import type { AdminEventModuleConfig } from '@/lib/api/types';
import { describeConfigValue, formatConfigValue, knownConfigFields } from '@/lib/planModuleConfig';

// A setting's value as text: a cap's number or Unlimited, a flag's On or Off (absent counts as off),
// a value as the plan grid shows it (a size, the vendor types by name).
export function useModuleConfigValue() {
    const labels = useConfigValueLabels();
    const locale = useLocale();

    return useCallback(
        (config: Pick<AdminEventModuleConfig, 'kind' | 'moduleKey' | 'configKey'>, value: AdminEventModuleConfig['effectiveValue']) => {
            if (config.kind === 'FLAG') return value === true ? labels.on : labels.off;
            if (config.kind === 'COUNT') return typeof value === 'number' ? value.toLocaleString(locale) : labels.unlimited;
            const field = knownConfigFields(config.moduleKey).find((item) => item.key === config.configKey);
            if (!field) return value === null ? labels.none : formatConfigValue(value);
            if (field.type === 'number' && !field.storage && typeof value === 'number') return value.toLocaleString(locale);
            return describeConfigValue(field, value, labels);
        },
        [labels, locale],
    );
}
