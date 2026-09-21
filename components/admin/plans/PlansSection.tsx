'use client';

import { useTranslations } from 'next-intl';

import { EventTypePlansPane } from '@/components/admin/plans/EventTypePlansPane';
import { PlansPaneEmpty } from '@/components/admin/plans/PlansPaneEmpty';
import { PlansRail } from '@/components/admin/plans/PlansRail';
import { PlansSettingsEventTypes } from '@/components/admin/plans/PlansSettingsEventTypes';
import { PlansSettingsModules } from '@/components/admin/plans/PlansSettingsModules';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePlansSection } from '@/hooks/usePlansSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PlansSection() {
    const t = useTranslations('AdminPage');
    const section = usePlansSection();
    const showingEventType = section.view.view === 'eventType';

    return (
        <div className="mx-auto px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {/* Header */}
            <header className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('plans.sectionTitle')}</h1>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                {/* Rail */}
                <PlansRail
                    view={section.view}
                    selectedEventTypeKey={section.selectedEventTypeKey}
                    eventTypes={section.railEventTypes}
                    search={section.search}
                    onSearchChangeAction={section.handleSearchChange}
                    onSelectEventTypeAction={section.selectEventType}
                    onOpenSettingsModulesAction={section.openSettingsModules}
                    onOpenSettingsEventTypesAction={section.openSettingsEventTypes}
                />

                {/* Pane */}
                {section.view.view === 'settingsModules' && <PlansSettingsModules />}
                {section.view.view === 'settingsEventTypes' && <PlansSettingsEventTypes />}
                {showingEventType && section.isLoading && <LoadingState label={t('plans.loading')} className="justify-start py-6" />}
                {showingEventType && section.error && (
                    <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(section.error)}`)}</p>
                )}
                {showingEventType && !section.isLoading && !section.error && !section.selectedEventType && <PlansPaneEmpty />}
                {showingEventType && !section.isLoading && !section.error && section.selectedEventType && (
                    <EventTypePlansPane key={section.selectedEventType.eventTypeKey} eventType={section.selectedEventType} section={section} />
                )}
            </div>
        </div>
    );
}
