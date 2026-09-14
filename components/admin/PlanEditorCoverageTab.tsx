'use client';

import { useTranslations } from 'next-intl';

import { AdminTabPanel } from '@/components/admin/AdminTabs';
import { type AdminToggleItem, AdminToggleList } from '@/components/admin/AdminToggleList';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlatformEventTypeResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

export function PlanEditorCoverageTab({
    editorId,
    activeTab,
    orderedModules,
    moduleKeysDraft,
    baselineModuleKeys,
    onToggleModuleAction,
    orderedEventTypes,
    eventTypeKey,
    sharedGroupKey,
}: {
    editorId: string;
    activeTab: string;
    orderedModules: PlatformModuleResponseDto[];
    moduleKeysDraft: string[];
    baselineModuleKeys: string[];
    onToggleModuleAction: (key: string, next: boolean) => void;
    orderedEventTypes: PlatformEventTypeResponseDto[];
    eventTypeKey: string | null;
    sharedGroupKey: string | null;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    const moduleItems: AdminToggleItem[] = orderedModules.map((module) => ({
        key: module.moduleKey,
        label: module.name,
        hint: module.isEnabled ? undefined : t('plans.coverage.modulePlatformOff'),
        // A module switched off platform-wide can be dropped from a plan but not added to one.
        locked: !module.isEnabled && !moduleKeysDraft.includes(module.moduleKey),
    }));

    const eventTypeName = eventTypeKey
        ? localizedText(orderedEventTypes.find((item) => item.eventTypeKey === eventTypeKey)?.name, eventTypeKey)
        : null;

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

            {/* Event type */}
            <section className="mt-7">
                <h3 className="mb-2 text-sm font-bold text-ink">{t('plans.tabs.eventTypes')}</h3>
                <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.eventTypesHint')}</p>
                <div className="flex flex-wrap items-center gap-2">
                    {eventTypeName && (
                        <span className="rounded-md bg-canvas px-2.5 py-1 text-sm font-semibold text-ink">
                            {t('plans.coverage.eventTypeLabel')}: {eventTypeName}
                        </span>
                    )}
                    {sharedGroupKey && (
                        <span className="rounded-md bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-faint">
                            {t('plans.coverage.sharedGroupLabel', { group: sharedGroupKey })}
                        </span>
                    )}
                </div>
            </section>
        </AdminTabPanel>
    );
}
