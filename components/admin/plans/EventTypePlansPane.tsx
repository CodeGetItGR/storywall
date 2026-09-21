'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { PlanCreateForm } from '@/components/admin/PlanCreateForm';
import { PlanEditorCard } from '@/components/admin/PlanEditorCard';
import { EventTypePlansHeader } from '@/components/admin/plans/EventTypePlansHeader';
import { EventTypePlansTable } from '@/components/admin/plans/EventTypePlansTable';
import { PlanModuleGrid } from '@/components/admin/plans/PlanModuleGrid';
import { PlanStatusFilter } from '@/components/admin/plans/PlanStatusFilter';
import { useEventTypePlansPane } from '@/hooks/useEventTypePlansPane';
import type { PlansSectionState } from '@/hooks/usePlansSection';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export function EventTypePlansPane({ eventType, section }: { eventType: PlatformEventTypeResponseDto; section: PlansSectionState }) {
    const t = useTranslations('AdminPage');
    const pane = useEventTypePlansPane(section.allPlans, section.selectEventType);

    return (
        <div className="min-w-0 flex-1 space-y-5">
            {/* Header */}
            <EventTypePlansHeader eventType={eventType} onCreateAction={pane.openCreate} />

            {/* Save/create confirmation */}
            {pane.savedMessage && (
                <p role="status" className="rounded-lg bg-status-good-wash px-4 py-2.5 text-sm font-semibold text-status-good">
                    {pane.savedMessage}
                </p>
            )}

            {/* Plans */}
            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <PlanStatusFilter value={section.statusFilter} counts={section.statusCounts} onChangeAction={section.setStatusFilter} />
                </div>
                <EventTypePlansTable
                    plans={section.visiblePlans}
                    allPlans={section.allPlans}
                    eventTypes={section.orderedEventTypes}
                    onEditClickAction={pane.handleEditClick}
                    onDuplicateClickAction={pane.handleDuplicateClick}
                    onSelectEventTypeAction={section.selectEventType}
                />
            </section>

            {/* Modules */}
            <PlanModuleGrid eventType={eventType} plans={section.plansForType} modules={section.modules} unlocks={section.unlocks} />

            <PlanCreateForm
                key={pane.duplicatePlan?.id ?? `new-plan-${eventType.eventTypeKey}`}
                open={pane.createOpen}
                onCloseAction={pane.closeCreate}
                onCreatedAction={pane.handleCreated}
                plans={section.allPlans}
                eventTypes={section.orderedEventTypes}
                modules={section.modules}
                scope="EVENT"
                sourcePlan={pane.duplicatePlan}
                initialEventTypeKey={eventType.eventTypeKey}
            />

            <AdminDrawer
                open={Boolean(pane.selectedPlan)}
                onClose={pane.closeEditor}
                closeLabel={t('cancel')}
                title={pane.selectedPlan?.name ?? ''}
                subtitle={pane.selectedPlan?.code}
            >
                {pane.selectedPlan && (
                    <PlanEditorCard
                        key={`${pane.selectedPlan.id}:${pane.selectedPlan.moduleKeys.join(',')}`}
                        plan={pane.selectedPlan}
                        modules={section.modules}
                        eventTypes={section.orderedEventTypes}
                        paidServices={section.unlocks}
                        eventPlans={section.allPlans}
                        scope="EVENT"
                        onSavedAction={pane.handleSaved}
                        onOpenGridAction={pane.openGridFromEditor}
                        onOpenSiblingAction={pane.openSibling}
                    />
                )}
            </AdminDrawer>
        </div>
    );
}
