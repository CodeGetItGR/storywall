'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useAdminPlatformModules } from '@/hooks/useAdmin';
import { useConfigValueLabels } from '@/hooks/useConfigValueLabels';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import { auditSummary } from '@/lib/adminAuditLog';
import type { AdminAuditLogResponseDto } from '@/lib/api/types';
import { describeConfigValue, knownConfigFields, readableConfigChanges } from '@/lib/planModuleConfig';

// An audit entry's one line in words ("Vendors · Vendor types: All → Photographer"), or null for
// actions without one.
export function useAuditSummaryText() {
    const t = useTranslations('AdminPage.auditLog.summary');
    const labels = useConfigValueLabels();
    const modulesQuery = useAdminPlatformModules();
    const moduleLabel = useLocalizedModuleLabel(modulesQuery.data ?? []);

    return useCallback(
        (entry: Pick<AdminAuditLogResponseDto, 'action' | 'details'>): string | null => {
            const summary = auditSummary(entry);
            if (!summary) return null;
            const moduleName = (key: string) => moduleLabel(key).name;

            // A setting's value in words; null is the plan's own.
            const describe = (moduleKey: string, configKey: string, via: 'extra' | 'enabled' | 'value', value: unknown) => {
                if (value === null || value === undefined) return t('plansValue');
                if (via === 'extra') return `+${String(value)}`;
                if (via === 'enabled') return value === true ? labels.on : labels.off;
                const field = knownConfigFields(moduleKey).find((item) => item.key === configKey);
                return field ? describeConfigValue(field, value, labels) : JSON.stringify(value);
            };

            switch (summary.kind) {
                case 'configSet':
                    return t('configSet', {
                        module: moduleName(summary.moduleKey),
                        setting: labels.field(summary.configKey),
                        before: describe(summary.moduleKey, summary.configKey, summary.via, summary.previous),
                        after: describe(summary.moduleKey, summary.configKey, summary.via, summary.next),
                    });
                case 'configReset':
                    return t('configReset', { module: moduleName(summary.moduleKey), setting: labels.field(summary.configKey) });
                case 'module':
                    return moduleName(summary.moduleKey);
                case 'provisioned':
                    return t('provisioned', { title: summary.title ?? '—', plan: summary.planTierCode ?? '—', count: summary.settings });
                case 'planModules': {
                    const parts = [
                        ...(summary.added.length ? [t('added', { modules: summary.added.map(moduleName).join(', ') })] : []),
                        ...(summary.removed.length ? [t('removed', { modules: summary.removed.map(moduleName).join(', ') })] : []),
                    ];
                    return `${summary.planTierCode ?? '—'}: ${parts.join(' · ')}`;
                }
                case 'planConfig': {
                    const changes = readableConfigChanges(summary.moduleKey, summary.before, summary.after, labels)
                        .map((change) => `${change.key}: ${change.before} → ${change.after}`)
                        .join(' · ');
                    return t('planConfig', { plan: summary.planTierCode ?? '—', module: moduleName(summary.moduleKey), changes });
                }
            }
        },
        [labels, moduleLabel, t],
    );
}
