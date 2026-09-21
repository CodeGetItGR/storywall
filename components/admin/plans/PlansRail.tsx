'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { PlansRailSearch } from '@/components/admin/plans/PlansRailSearch';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlansView } from '@/lib/adminPlansRouting';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export type PlansRailEventType = { type: PlatformEventTypeResponseDto; liveCount: number };

const ITEM_CLASS = 'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors';
const ACTIVE_CLASS = 'bg-primary-light text-primary-dark';
const IDLE_CLASS = 'text-ink-muted hover:bg-canvas hover:text-ink';

export function PlansRail({
    view,
    selectedEventTypeKey,
    eventTypes,
    search,
    onSearchChangeAction,
    onSelectEventTypeAction,
    onOpenSettingsModulesAction,
    onOpenSettingsEventTypesAction,
}: {
    view: PlansView;
    selectedEventTypeKey: string | null;
    eventTypes: PlansRailEventType[];
    search: string;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
    onOpenSettingsModulesAction: () => void;
    onOpenSettingsEventTypesAction: () => void;
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
            <PlansRailSearch value={search} onChangeAction={onSearchChangeAction} />

            {/* Event types */}
            <nav aria-label={t('rail.eventTypes')} className="space-y-px">
                {eventTypes.map(({ type, liveCount }) => {
                    const active = view.view === 'eventType' && type.eventTypeKey === selectedEventTypeKey;
                    return (
                        <button
                            key={type.eventTypeKey}
                            type="button"
                            data-event-type-key={type.eventTypeKey}
                            aria-current={active ? 'page' : undefined}
                            onClick={handleTypeClick}
                            className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS, !type.isEnabled && 'opacity-60')}
                        >
                            <span className="truncate">{localizedText(type.name, type.eventTypeKey)}</span>
                            <span className="shrink-0 font-mono text-[11px] text-ink-faint">{liveCount}</span>
                        </button>
                    );
                })}
                {eventTypes.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('rail.noMatches')}</p>}
            </nav>

            {/* Settings */}
            <nav aria-label={t('rail.settings')} className="border-t border-border pt-3">
                <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">{t('rail.settings')}</p>
                <div className="space-y-px">
                    <button
                        type="button"
                        aria-current={view.view === 'settingsModules' ? 'page' : undefined}
                        onClick={onOpenSettingsModulesAction}
                        className={cn(ITEM_CLASS, view.view === 'settingsModules' ? ACTIVE_CLASS : IDLE_CLASS)}
                    >
                        {t('rail.modules')}
                    </button>
                    <button
                        type="button"
                        aria-current={view.view === 'settingsEventTypes' ? 'page' : undefined}
                        onClick={onOpenSettingsEventTypesAction}
                        className={cn(ITEM_CLASS, view.view === 'settingsEventTypes' ? ACTIVE_CLASS : IDLE_CLASS)}
                    >
                        {t('rail.eventTypesSettings')}
                    </button>
                </div>
            </nav>
        </aside>
    );
}
