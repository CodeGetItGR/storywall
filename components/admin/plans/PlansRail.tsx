'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { AdminRailItem } from '@/components/admin/AdminRailItem';
import { AdminRailSearch } from '@/components/admin/AdminRailSearch';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlansView } from '@/lib/adminPlansRouting';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export type PlansRailEventType = { type: PlatformEventTypeResponseDto; liveCount: number };

export function PlansRail({
    view,
    selectedEventTypeKey,
    eventTypes,
    search,
    onSearchChangeAction,
    onSelectEventTypeAction,
    onOpenSettingsModulesAction,
    onOpenSettingsEventTypesAction,
    onOpenSettingsLandingCategoriesAction,
    onOpenSettingsMemberRolesAction,
}: {
    view: PlansView;
    selectedEventTypeKey: string | null;
    eventTypes: PlansRailEventType[];
    search: string;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
    onOpenSettingsModulesAction: () => void;
    onOpenSettingsEventTypesAction: () => void;
    onOpenSettingsLandingCategoriesAction: () => void;
    onOpenSettingsMemberRolesAction: () => void;
}) {
    const t = useTranslations('AdminPage.plans');
    const localizedText = useLocalizedText();

    function handleTypeClick(event: MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.dataset.eventTypeKey;
        if (key) onSelectEventTypeAction(key);
    }

    return (
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-52">
            {/* Search */}
            <AdminRailSearch value={search} placeholder={t('search.placeholder')} onChangeAction={onSearchChangeAction} />

            {/* Event types */}
            <nav aria-label={t('rail.eventTypes')} className="space-y-px">
                {eventTypes.map(({ type, liveCount }) => (
                    <AdminRailItem
                        key={type.eventTypeKey}
                        data-event-type-key={type.eventTypeKey}
                        active={view.view === 'eventType' && type.eventTypeKey === selectedEventTypeKey}
                        muted={!type.isEnabled}
                        onClick={handleTypeClick}
                    >
                        <span className="truncate">{localizedText(type.name, type.eventTypeKey)}</span>
                        <span className="shrink-0 font-mono text-[11px] text-ink-faint">{liveCount}</span>
                    </AdminRailItem>
                ))}
                {eventTypes.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('rail.noMatches')}</p>}
            </nav>

            {/* Settings */}
            <nav aria-label={t('rail.settings')} className="border-t border-border pt-3">
                <p className="mb-1.5 px-2.5 text-[10.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">{t('rail.settings')}</p>
                <div className="space-y-px">
                    <AdminRailItem active={view.view === 'settingsModules'} onClick={onOpenSettingsModulesAction}>
                        {t('rail.modules')}
                    </AdminRailItem>
                    <AdminRailItem active={view.view === 'settingsEventTypes'} onClick={onOpenSettingsEventTypesAction}>
                        {t('rail.eventTypesSettings')}
                    </AdminRailItem>
                    <AdminRailItem active={view.view === 'settingsLandingCategories'} onClick={onOpenSettingsLandingCategoriesAction}>
                        {t('rail.landingCategories')}
                    </AdminRailItem>
                    <AdminRailItem active={view.view === 'settingsMemberRoles'} onClick={onOpenSettingsMemberRolesAction}>
                        {t('rail.memberRoles')}
                    </AdminRailItem>
                </div>
            </nav>
        </aside>
    );
}
