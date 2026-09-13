'use client';

import { useTranslations } from 'next-intl';

import { AdminTabPanel } from '@/components/admin/AdminTabs';
import { type AdminToggleItem,AdminToggleList } from '@/components/admin/AdminToggleList';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlanEditorCoverageTab({
    editorId,
    activeTab,
    orderedModules,
    moduleKeysDraft,
    baselineModuleKeys,
    onToggleModuleAction,
    orderedEventTypes,
    eventTypeKeysDraft,
    baselineEventTypeKeys,
    onToggleEventTypeAction,
    onAllEventTypesAction,
    onSelectedEventTypesAction,
}: {
    editorId: string;
    activeTab: string;
    orderedModules: PlatformModuleResponseDto[];
    moduleKeysDraft: string[];
    baselineModuleKeys: string[];
    onToggleModuleAction: (key: string, next: boolean) => void;
    orderedEventTypes: PlatformEventTypeResponseDto[];
    eventTypeKeysDraft: string[];
    baselineEventTypeKeys: string[];
    onToggleEventTypeAction: (key: string, next: boolean) => void;
    onAllEventTypesAction: () => void;
    onSelectedEventTypesAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    // An empty restriction list means "every event type" on the wire, so the
    // segmented control reads the draft rather than tracking its own flag.
    const allEventTypes = eventTypeKeysDraft.length === 0;
    const isLastEventType = eventTypeKeysDraft.length === 1;

    const moduleItems: AdminToggleItem[] = orderedModules.map((module) => ({
        key: module.moduleKey,
        label: module.name,
        hint: module.isEnabled ? undefined : t('plans.coverage.modulePlatformOff'),
        // A module switched off platform-wide can be dropped from a plan but not added to one.
        locked: !module.isEnabled && !moduleKeysDraft.includes(module.moduleKey),
    }));

    const eventTypeItems: AdminToggleItem[] = orderedEventTypes.map((eventType) => {
        const selected = eventTypeKeysDraft.includes(eventType.eventTypeKey);
        const isLocked = selected && isLastEventType;
        return {
            key: eventType.eventTypeKey,
            label: localizedText(eventType.name),
            hint: isLocked ? t('plans.coverage.lastEventType') : undefined,
            locked: isLocked,
        };
    });

    return (
        <AdminTabPanel id={editorId} tabKey="coverage" active={activeTab} className="pt-5">
            {/* Modules */}
            <section>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">{t('plans.includedModules')}</h3>
                    <p className="text-xs font-semibold text-ink-faint">
                        {t('plans.coverage.modulesCount', { count: moduleKeysDraft.length, total: orderedModules.length })}
                    </p>
                </div>
                <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.modulesHint')}</p>
                <AdminToggleList
                    items={moduleItems}
                    selected={moduleKeysDraft}
                    baseline={baselineModuleKeys}
                    changedLabel={t('plans.coverage.changed')}
                    onToggleAction={onToggleModuleAction}
                />
            </section>

            {/* Event types */}
            <section className="mt-7">
                <h3 className="mb-2 text-sm font-bold text-ink">{t('plans.tabs.eventTypes')}</h3>
                <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.eventTypesHint')}</p>
                <div className="flex gap-1 rounded-lg bg-canvas p-1">
                    <button
                        type="button"
                        onClick={onAllEventTypesAction}
                        aria-pressed={allEventTypes}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            allEventTypes ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                        )}
                    >
                        {t('planAvailability.allTypes')}
                    </button>
                    <button
                        type="button"
                        onClick={onSelectedEventTypesAction}
                        aria-pressed={!allEventTypes}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            allEventTypes ? 'text-ink-faint hover:text-ink-muted' : 'bg-card text-ink shadow-sm'
                        )}
                    >
                        {t('planAvailability.selectedTypes')}
                    </button>
                </div>

                {allEventTypes ? (
                    <p className="mt-3 text-sm text-ink-muted">{t('plans.coverage.allEventTypesHint')}</p>
                ) : (
                    <div className="mt-3">
                        <AdminToggleList
                            items={eventTypeItems}
                            selected={eventTypeKeysDraft}
                            baseline={baselineEventTypeKeys}
                            changedLabel={t('plans.coverage.changed')}
                            onToggleAction={onToggleEventTypeAction}
                        />
                    </div>
                )}
            </section>
        </AdminTabPanel>
    );
}
