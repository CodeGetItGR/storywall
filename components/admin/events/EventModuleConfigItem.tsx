'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useModuleConfigValue } from '@/hooks/useModuleConfigValue';
import type { AdminEventModuleConfig } from '@/lib/api/types';

// One setting of a module: what the event gets, marked when an admin changed it, and the edit button.
export function EventModuleConfigItem({
    config,
    editable,
    onEditAction,
}: {
    config: AdminEventModuleConfig;
    editable: boolean;
    onEditAction: (moduleKey: string, configKey: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const formatValue = useModuleConfigValue();
    const edit = useCallback(() => onEditAction(config.moduleKey, config.configKey), [onEditAction, config.moduleKey, config.configKey]);
    const extra = config.override?.extra;

    return (
        <li className="flex items-center gap-2 text-xs">
            {/* Label and value */}
            <span className="text-ink-muted">{t(`plans.grid.cell.fields.${config.configKey}`)}</span>
            <span className="font-mono font-semibold text-ink tabular-nums">{formatValue(config.kind, config.effectiveValue)}</span>

            {/* Admin change */}
            {config.override && (
                <span className="rounded-full border border-ink/15 bg-card px-1.5 py-px text-[10.5px] font-bold text-ink" title={config.override.reason}>
                    {typeof extra === 'number' ? `+${extra.toLocaleString(locale)}` : t('events.moduleConfig.admin')}
                </span>
            )}

            {/* Edit */}
            {editable && (
                <button type="button" onClick={edit} className="ml-auto font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                    {t('events.moduleConfig.edit')}
                </button>
            )}
        </li>
    );
}
