'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEventHandler } from 'react';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { AdminTabPanel } from '@/components/admin/AdminTabs';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export function PlanEditorEventTypesTab({
    editorId,
    activeTab,
    orderedEventTypes,
    eventTypeKeys,
    onEventTypeChange,
}: {
    editorId: string;
    activeTab: string;
    orderedEventTypes: PlatformEventTypeResponseDto[];
    eventTypeKeys: string[];
    onEventTypeChange: ChangeEventHandler<HTMLInputElement>;
}) {
    const t = useTranslations('AdminPage');
    const unrestricted = eventTypeKeys.length === 0;

    return (
        <AdminTabPanel id={editorId} tabKey="eventTypes" active={activeTab} className="pt-5">
            {/* Event types */}
            <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.sections.eventTypesHint')}</p>
            <p
                className={
                    unrestricted
                        ? 'mb-3 rounded-md bg-status-good-wash px-3 py-2 text-xs font-semibold text-status-good'
                        : 'mb-3 rounded-md bg-primary-light px-3 py-2 text-xs font-semibold text-primary-dark'
                }
            >
                {unrestricted ? t('plans.eventTypes.unrestricted') : t('plans.eventTypes.restricted', { count: eventTypeKeys.length })}
            </p>
            <div className="divide-y divide-border/70">
                {orderedEventTypes.map((eventType) => (
                    <AdminSwitch
                        key={eventType.eventTypeKey}
                        name={eventType.eventTypeKey}
                        label={eventType.name}
                        description={eventType.description ?? undefined}
                        checked={eventTypeKeys.includes(eventType.eventTypeKey)}
                        onChange={onEventTypeChange}
                        optional={false}
                    />
                ))}
            </div>
        </AdminTabPanel>
    );
}
