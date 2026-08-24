'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEventHandler } from 'react';

import { AdminSection } from '@/components/admin/AdminSection';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeConvention, ModuleKey, PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanCreateAssignments({
    availabilityMode,
    eventTypeKeys,
    moduleKeys,
    eventTypes,
    modules,
    onSelectAllEventTypesAction,
    onSelectSpecificEventTypesAction,
    onEventTypeChangeAction,
    onModuleChangeAction,
}: {
    availabilityMode: 'ALL' | 'SELECTED';
    eventTypeKeys: EventTypeConvention[];
    moduleKeys: ModuleKey[];
    eventTypes: PlatformEventTypeResponseDto[];
    modules: PlatformModuleResponseDto[];
    onSelectAllEventTypesAction: () => void;
    onSelectSpecificEventTypesAction: () => void;
    onEventTypeChangeAction: ChangeEventHandler<HTMLInputElement>;
    onModuleChangeAction: ChangeEventHandler<HTMLInputElement>;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    return (
        <>
            {/* Event type availability */}
            <AdminSection title={t('planAvailability.createTitle')} description={t('planAvailability.createHint')}>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1" role="group" aria-label={t('planAvailability.createTitle')}>
                    <button
                        type="button"
                        aria-pressed={availabilityMode === 'ALL'}
                        onClick={onSelectAllEventTypesAction}
                        className={cn(
                            'min-h-9 rounded-md px-3 text-sm font-semibold transition-colors',
                            availabilityMode === 'ALL' ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                        )}
                    >
                        {t('planAvailability.allTypes')}
                    </button>
                    <button
                        type="button"
                        aria-pressed={availabilityMode === 'SELECTED'}
                        onClick={onSelectSpecificEventTypesAction}
                        className={cn(
                            'min-h-9 rounded-md px-3 text-sm font-semibold transition-colors',
                            availabilityMode === 'SELECTED' ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                        )}
                    >
                        {t('planAvailability.selectedTypes')}
                    </button>
                </div>
                {availabilityMode === 'SELECTED' && (
                    <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
                        {eventTypes.map((eventType) => (
                            <label
                                key={eventType.eventTypeKey}
                                className={cn(
                                    'flex min-h-10 items-center gap-2 border-b border-border/70 py-2 text-sm font-semibold',
                                    eventType.isEnabled ? 'cursor-pointer text-ink-muted' : 'cursor-not-allowed text-ink-faint'
                                )}
                            >
                                <input
                                    type="checkbox"
                                    value={eventType.eventTypeKey}
                                    checked={eventTypeKeys.includes(eventType.eventTypeKey)}
                                    onChange={onEventTypeChangeAction}
                                    disabled={!eventType.isEnabled}
                                    className="h-4 w-4 accent-primary"
                                />
                                <span>{localizedText(eventType.name)}</span>
                            </label>
                        ))}
                    </div>
                )}
            </AdminSection>

            {/* Included modules */}
            <AdminSection title={t('planModules.createTitle')} description={t('planModules.createHint')}>
                <div className="grid gap-x-4 sm:grid-cols-2">
                    {modules.map((moduleItem) => (
                        <label
                            key={moduleItem.moduleKey}
                            className={cn(
                                'flex min-h-10 items-center gap-2 border-b border-border/70 py-2 text-sm font-semibold',
                                moduleItem.isEnabled ? 'cursor-pointer text-ink-muted' : 'cursor-not-allowed text-ink-faint'
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
