'use client';

import { ChevronDown, Layers3, Loader2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlanTiers, useAssignEventPlanTier, useAssignUserPlanTier } from '@/hooks/useAdmin';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AccountUsageResponseDto, EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { scopedPlans } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

function usageItems(usage: AccountUsageResponseDto | EventUsageResponseDto) {
    if ('activeEvents' in usage) {
        return [
            {
                key: 'activeEvents' as const,
                used: usage.activeEvents,
                limit: usage.activeEventLimit,
                percent: usage.activeEventPercent,
                valueLabel: usage.activeEventLimit === null ? String(usage.activeEvents) : `${usage.activeEvents} / ${usage.activeEventLimit}`,
            },
        ];
    }

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
    const assignUser = useAssignUserPlanTier();
    const assignEvent = useAssignEventPlanTier();
    const [isUserFormExpanded, setIsUserFormExpanded] = useState(false);
    const [isEventFormExpanded, setIsEventFormExpanded] = useState(false);
    const [userUsage, setUserUsage] = useState<AccountUsageResponseDto | null>(null);
    const [eventUsage, setEventUsage] = useState<EventUsageResponseDto | null>(null);
    const [pendingUserAssignment, setPendingUserAssignment] = useState<{ userId: string; planTierCode: string } | null>(null);
    const [pendingEventAssignment, setPendingEventAssignment] = useState<{ eventId: string; planTierCode: string } | null>(null);
    const accountPlans = scopedPlans(plansQuery.data ?? [], 'ACCOUNT').filter((plan) => plan.isAssignable);
    const eventPlans = scopedPlans(plansQuery.data ?? [], 'EVENT').filter((plan) => plan.isAssignable);

    function handleToggleUserForm() {
        setIsUserFormExpanded((current) => !current);
    }

    function handleToggleEventForm() {
        setIsEventFormExpanded((current) => !current);
    }

    async function handleAssignUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const userId = String(formData.get('userId') ?? '').trim();
        const planTierCode = String(formData.get('planTierCode') ?? '').trim();
        if (!userId || !planTierCode) return;
        setPendingUserAssignment({ userId, planTierCode });
    }

    async function handleConfirmAssignUser() {
        if (!pendingUserAssignment) return;
        const usage = await assignUser.mutateAsync({
            userId: pendingUserAssignment.userId,
            input: { planTierCode: pendingUserAssignment.planTierCode },
        });
        setUserUsage(usage);
        setPendingUserAssignment(null);
    }

    async function handleAssignEvent(event: FormEvent<HTMLFormElement>) {
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

    function handleCloseAssignUserConfirm() {
        setPendingUserAssignment(null);
    }

    function handleCloseAssignEventConfirm() {
        setPendingEventAssignment(null);
    }

    return (
        <section className="grid gap-3 xl:grid-cols-2">
            <form onSubmit={handleAssignUser} className="border-b border-border pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-ink">{t('assignments.userTitle')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('assignments.userSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleToggleUserForm}
                        aria-expanded={isUserFormExpanded}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                    >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isUserFormExpanded && 'rotate-180')} />
                        {isUserFormExpanded ? t('collapse') : t('assignments.openUser')}
                    </button>
                </div>
                {isUserFormExpanded && (
                    <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.85fr)_auto] sm:items-end">
                        <AdminField label={t('assignments.userId')}>
                            <input name="userId" required className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.plan')}>
                            <select name="planTierCode" required className={adminInputClass()}>
                                {accountPlans.map((plan) => (
                                    <option key={plan.id} value={plan.code}>
                                        {plan.name} ({plan.code})
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        <button
                            type="submit"
                            disabled={assignUser.isPending}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {assignUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                            {t('assignments.assignUser')}
                        </button>
                        {assignUser.error && (
                            <p className="text-sm text-rose-600 sm:col-span-3">{t(`errors.${adminErrorMessageKey(assignUser.error)}`)}</p>
                        )}
                    </div>
                )}
                {userUsage && <UsagePanel title={t('assignments.freshAccountUsage')} planName={userUsage.planTier} items={usageItems(userUsage)} className="mt-4" />}
            </form>

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
                        <AdminField label={t('assignments.eventId')}>
                            <input name="eventId" required className={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('fields.plan')}>
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
                {eventUsage && <UsagePanel title={t('assignments.freshEventUsage')} planName={eventUsage.planTier} items={usageItems(eventUsage)} className="mt-4" />}
            </form>

            <ConfirmActionModal
                open={Boolean(pendingUserAssignment)}
                onClose={handleCloseAssignUserConfirm}
                title={pendingUserAssignment ? t('assignments.confirmUserTitle', { userId: pendingUserAssignment.userId }) : ''}
                body={pendingUserAssignment ? t('assignments.confirmUserBody', { plan: pendingUserAssignment.planTierCode }) : ''}
                cancelLabel={t('cancel')}
                confirmLabel={t('assignments.assignUser')}
                isConfirming={assignUser.isPending}
                onConfirm={handleConfirmAssignUser}
                tone="default"
            />

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
