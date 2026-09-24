'use client';

import { Layers3, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { AdminDurationSelect } from '@/components/admin/AdminDurationSelect';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAdminPlanTiers, useAssignEventPlanTier } from '@/hooks/useAdmin';
import { useAdminDurationPick } from '@/hooks/useAdminDurationPick';
import { adminErrorMessageKey, isUuid } from '@/lib/adminUtils';
import type { EventUsageResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import { liveInitialOptions, scopedPlans } from '@/lib/planTiers';

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
    const { focus } = useAdminNavigation();
    const plansQuery = useAdminPlanTiers(undefined, true);
    const assignEvent = useAssignEventPlanTier();
    const [eventId, setEventId] = useState('');
    const [eventTitle, setEventTitle] = useState<string | null>(null);
    const [pickedPlanCode, setPlanTierCode] = useState('');
    const [eventUsage, setEventUsage] = useState<EventUsageResponseDto | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [appliedFocus, setAppliedFocus] = useState(focus);
    // A plan with no duration on sale can't be assigned (409 COVERAGE_OPTION_UNAVAILABLE).
    const eventPlans = useMemo(
        () => scopedPlans(plansQuery.data ?? [], 'EVENT').filter((plan) => plan.isAssignable && liveInitialOptions(plan).length > 0),
        [plansQuery.data],
    );

    // Adjusting during render rather than in an effect: the prefilled id has to be
    // on screen the moment the panel opens, not one paint later.
    if (focus !== appliedFocus) {
        setAppliedFocus(focus);
        if (focus?.eventId) {
            setEventId(focus.eventId);
            setEventTitle(focus.eventTitle ?? null);
            setEventUsage(null);
        }
    }

    // A select with nothing chosen submits its first option silently, so what the
    // form acts on is derived from the list rather than left empty.
    const planTierCode = pickedPlanCode || eventPlans[0]?.code || '';

    const handleEventIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEventId(event.target.value);
        setEventTitle(null);
        setEventUsage(null);
    }, []);

    const handlePlanChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setPlanTierCode(event.target.value), []);
    const closeConfirm = useCallback(() => setConfirmOpen(false), []);

    const trimmedId = eventId.trim();
    const idIsValid = isUuid(trimmedId);
    const showIdError = trimmedId.length > 0 && !idIsValid;
    const selectedPlan = eventPlans.find((plan) => plan.code === planTierCode) ?? null;
    // Without a pick the event keeps its length on the new plan, else gets its shortest.
    const duration = useAdminDurationPick(selectedPlan);
    const canSubmit = idIsValid && Boolean(planTierCode);
    const confirmPlanLabel = duration.selectedOption
        ? `${selectedPlan?.name ?? planTierCode} · ${t('plans.columns.months', { count: duration.selectedOption.months })}`
        : (selectedPlan?.name ?? planTierCode);

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        setConfirmOpen(true);
    }

    const confirmAssign = useCallback(async () => {
        const coverageOptionId = duration.optionId || undefined;
        const usage = await assignEvent.mutateAsync({ eventId: trimmedId, input: { planTierCode, coverageOptionId } });
        setEventUsage(usage);
        setConfirmOpen(false);
    }, [assignEvent, duration.optionId, planTierCode, trimmedId]);

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="border-b border-border pb-4">
                <h2 className="text-xl font-semibold tracking-tight text-ink">{t('assignments.eventTitle')}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{t('assignments.eventSubtitle')}</p>
            </div>

            {/* Assignment */}
            <form onSubmit={handleSubmit} className="border-b border-border pb-5">
                <div className="grid max-w-4xl gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)_auto] sm:items-end">
                    <AdminField label={t('assignments.eventId')} required>
                        <input
                            value={eventId}
                            onChange={handleEventIdChange}
                            required
                            spellCheck={false}
                            aria-invalid={showIdError}
                            placeholder={t('lifecycle.eventIdPlaceholder')}
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                    <AdminField label={t('fields.plan')} required>
                        <select
                            value={planTierCode}
                            onChange={handlePlanChange}
                            required
                            disabled={eventPlans.length === 0}
                            className={adminInputClass()}
                        >
                            {eventPlans.map((plan) => (
                                <option key={plan.id} value={plan.code}>
                                    {plan.name}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    <AdminField label={t('assignments.duration')}>
                        <AdminDurationSelect
                            pick={duration}
                            currency={selectedPlan?.priceCurrency ?? null}
                            defaultLabel={t('assignments.durationDefault')}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <button
                        type="submit"
                        disabled={assignEvent.isPending || !canSubmit}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                    >
                        {assignEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers3 className="h-4 w-4" />}
                        {t('assignments.assignEvent')}
                    </button>
                </div>

                {eventTitle ? (
                    <p className="mt-2 text-sm font-semibold text-ink">{t('lifecycle.resolvedEvent', { title: eventTitle })}</p>
                ) : (
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-muted">{t('lifecycle.idSourceHint')}</p>
                )}
                {showIdError && <p className="mt-1 text-xs font-semibold text-status-danger">{t('lifecycle.idInvalid')}</p>}
                {!plansQuery.isLoading && eventPlans.length === 0 && (
                    <p className="mt-2 text-sm text-status-warn">{t('assignments.noAssignablePlans')}</p>
                )}
                {plansQuery.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(plansQuery.error)}`)}</p>}
                {assignEvent.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(assignEvent.error)}`)}</p>}
            </form>

            {/* Usage */}
            {eventUsage && (
                <UsagePanel title={t('assignments.freshEventUsage')} planName={eventUsage.planTier} items={usageItems(eventUsage)} className="mt-1" />
            )}

            {/* Confirm */}
            <ConfirmActionModal
                open={confirmOpen}
                onCloseAction={closeConfirm}
                title={t('assignments.confirmEventTitle', { event: eventTitle ?? trimmedId })}
                body={
                    <>
                        <p>{t('assignments.confirmEventBody', { plan: confirmPlanLabel })}</p>
                        <p className="mt-2 font-mono text-xs break-all text-ink-faint">{trimmedId}</p>
                    </>
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('assignments.assignEvent')}
                isConfirming={assignEvent.isPending}
                onConfirmAction={confirmAssign}
                tone="default"
            />
        </section>
    );
}
