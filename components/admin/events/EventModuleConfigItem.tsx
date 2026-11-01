'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useModuleConfigValue } from '@/hooks/useModuleConfigValue';
import type { AdminEventModuleConfig } from '@/lib/api/types';
import { cn } from '@/lib/utils';

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
    // A list (vendor types) is words, not a token: plain text on its own line under the label.
    const isList = Array.isArray(config.effectiveValue);

    return (
        <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {/* Label and value */}
            <span className="text-ink-muted">{t(`plans.grid.cell.fields.${config.configKey}`)}</span>
            <span className={cn('font-semibold text-ink', isList ? 'order-last w-full' : 'font-mono tabular-nums')}>
                {formatValue(config, config.effectiveValue)}
            </span>

            {/* Admin change */}
            {config.override && (
                <span
                    className="shrink-0 rounded-full border border-ink/15 bg-card px-1.5 py-px text-[10.5px] font-bold text-ink"
                    title={config.override.reason}
                >
                    {typeof extra === 'number' ? `+${extra.toLocaleString(locale)}` : t('events.moduleConfig.admin')}
                </span>
            )}

            {/* Edit */}
            {editable && (
                <button
                    type="button"
                    onClick={edit}
                    className="ml-auto shrink-0 font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                >
                    {t('events.moduleConfig.edit')}
                </button>
            )}
        </li>
    );
}
