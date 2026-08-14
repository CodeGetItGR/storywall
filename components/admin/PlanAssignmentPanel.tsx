'use client';

import { ChevronDown, Layers3, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlanTiers, useAssignEventPlanTier } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { scopedPlans } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

function usageItems(usage: EventUsageResponseDto) {
    return [
        {
            key: 'storage' as const,
            used: usage.storageBytes,
            limit: usage.storageLimitBytes,
            percent: usage.storagePercent,
            valueLabel:
                usage.storageLimitBytes === null
                    ? formatBytes(usage.storageBytes)
                    : `${formatBytes(usage.storageBytes)} / ${formatBytes(usage.storageLimitBytes)}`,
        },
        {
            key: 'members' as const,
            used: usage.memberCount,
            limit: usage.memberLimit,
            percent: usage.memberPercent,
            valueLabel: usage.memberLimit === null ? String(usage.memberCount) : `${usage.memberCount} / ${usage.memberLimit}`,
        },
    ];
}

export function PlanAssignmentPanel() {
    const t = useTranslations('AdminPage');
    const plansQuery = useAdminPlanTiers(undefined, true);
    const assignEvent = useAssignEventPlanTier();
    const [isEventFormExpanded, setIsEventFormExpanded] = useState(false);
    const [eventUsage, setEventUsage] = useState<EventUsageResponseDto | null>(null);
    const [pendingEventAssignment, setPendingEventAssignment] = useState<{ eventId: string; planTierCode: string } | null>(null);
    const eventPlans = scopedPlans(plansQuery.data ?? [], 'EVENT').filter((plan) => plan.isAssignable);

    function handleToggleEventForm() {
        setIsEventFormExpanded((current) => !current);
    }

    async function handleAssignEvent(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const eventId = String(formData.get('eventId') ?? '').trim();
        const planTierCode = String(formData.get('planTierCode') ?? '').trim();
        if (!eventId || !planTierCode) return;
        setPendingEventAssignment({ eventId, planTierCode });
    }

    async function handleConfirmAssignEvent() {
        if (!pendingEventAssignment) return;
        const usage = await assignEvent.mutateAsync({
            eventId: pendingEventAssignment.eventId,
            input: { planTierCode: pendingEventAssignment.planTierCode },
        });
        setEventUsage(usage);
        setPendingEventAssignment(null);
    }

    function handleCloseAssignEventConfirm() {
        setPendingEventAssignment(null);
    }

    return (
        <section className="grid gap-3">
            <form onSubmit={handleAssignEvent} className="border-b border-border pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-ink">{t('assignments.eventTitle')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('assignments.eventSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleToggleEventForm}
                        aria-expanded={isEventFormExpanded}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                    >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isEventFormExpanded && 'rotate-180')} />
                        {isEventFormExpanded ? t('collapse') : t('assignments.openEvent')}
                    </button>
                </div>
                {isEventFormExpanded && (
                    <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.85fr)_auto] sm:items-end">
                        <AdminField label={t('assignments.eventId')} required>
                            <input name="eventId" required className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.plan')} required>
                            <select name="planTierCode" required className={adminInputClass()}>
                                {eventPlans.map((plan) => (
                                    <option key={plan.id} value={plan.code}>
                                        {plan.name} ({plan.code})
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <button
                            type="submit"
                            disabled={assignEvent.isPending}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {assignEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers3 className="h-4 w-4" />}
                            {t('assignments.assignEvent')}
                        </button>
                        {assignEvent.error && (
                            <p className="text-sm text-rose-600 sm:col-span-3">{t(`errors.${adminErrorMessageKey(assignEvent.error)}`)}</p>
                        )}
                    </div>
                )}
                {eventUsage && (
                    <UsagePanel
                        title={t('assignments.freshEventUsage')}
                        planName={eventUsage.planTier}
                        items={usageItems(eventUsage)}
                        className="mt-4"
                    />
                )}
            </form>

            <ConfirmActionModal
                open={Boolean(pendingEventAssignment)}
                onClose={handleCloseAssignEventConfirm}
                title={pendingEventAssignment ? t('assignments.confirmEventTitle', { eventId: pendingEventAssignment.eventId }) : ''}
                body={pendingEventAssignment ? t('assignments.confirmEventBody', { plan: pendingEventAssignment.planTierCode }) : ''}
                cancelLabel={t('cancel')}
                confirmLabel={t('assignments.assignEvent')}
                isConfirming={assignEvent.isPending}
                onConfirm={handleConfirmAssignEvent}
                tone="default"
            />
        </section>
    );
}
