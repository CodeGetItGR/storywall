'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEventHandler } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeConvention, ModuleKey, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanCreateAssignments({
    eventTypeKey,
    moduleKeys,
    eventTypes,
    modules,
    eventTypeLocked = false,
    onEventTypeSelectAction,
    onModuleChangeAction,
}: {
    eventTypeKey: EventTypeConvention | null;
    moduleKeys: ModuleKey[];
    eventTypes: PlatformEventTypeResponseDto[];
    modules: PlatformModuleResponseDto[];
    eventTypeLocked?: boolean;
    onEventTypeSelectAction: ChangeEventHandler<HTMLSelectElement>;
    onModuleChangeAction: ChangeEventHandler<HTMLInputElement>;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    return (
        <>
            {/* Event type */}
            <AdminSection title={t('planAvailability.createTitle')} description={t('planAvailability.createHint')}>
                <AdminField label={t('plans.tabs.eventTypes')} required>
                    <select
                        required
                        disabled={eventTypeLocked}
                        value={eventTypeKey ?? ''}
                        onChange={onEventTypeSelectAction}
                        className={adminInputClass('max-w-xs')}
                    >
                        <option value="" disabled>
                            {t('planAvailability.selectType')}
                        </option>
                        {eventTypes.map((eventType) => (
                            <option key={eventType.eventTypeKey} value={eventType.eventTypeKey} disabled={!eventType.isEnabled}>
                                {localizedText(eventType.name)}
                            </option>
                        ))}
                    </select>
                </AdminField>
            </AdminSection>

            {/* Included modules */}
            <AdminSection title={t('planModules.createTitle')} description={t('planModules.createHint')}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                    {modules.map((moduleItem) => (
                        <label
                            key={moduleItem.moduleKey}
                            className={cn(
                                'flex min-h-10 items-center gap-2 border-b border-border/70 py-2 text-sm font-semibold',
                                moduleItem.isEnabled ? 'cursor-pointer text-ink-muted' : 'cursor-not-allowed text-ink-faint',
                            )}
                        >
                            <input
                                type="checkbox"
                                value={moduleItem.moduleKey}
                                checked={moduleKeys.includes(moduleItem.moduleKey)}
                                onChange={onModuleChangeAction}
                                disabled={!moduleItem.isEnabled}
                                className="h-4 w-4 accent-primary"
                            />
                            <span>{moduleItem.name}</span>
                        </label>
                    ))}
                </div>
            </AdminSection>
        </>
    );
}
