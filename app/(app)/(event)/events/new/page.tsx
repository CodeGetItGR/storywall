'use client';

import { ArrowLeft, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { EventPlanPaymentStep } from '@/components/plan/EventPlanPaymentStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCreateEvent } from '@/hooks/useEvent';
import { useMeUsage } from '@/hooks/useUsage';
import { ERROR_CODES, getErrorCode, getErrorMessage, getFieldErrors, getQuotaExceededDetails } from '@/lib/api/errors';
import type { EventRequestDto, EventTypeConvention } from '@/lib/api/types';
import { findNextPlan, findPlanByCode, publicAssignablePlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useEventSwitcher } from '@/providers/EventProvider';

const EVENT_TYPES: EventTypeConvention[] = ['WEDDING', 'BAPTISM', 'BIRTHDAY', 'CONFERENCE'];

export default function CreateEventPage() {
    const t = useTranslations('CreateEventPage');
    const router = useRouter();
    const { setActiveEventId } = useEventSwitcher();
    const createEvent = useCreateEvent();
    const { data: accountUsage } = useMeUsage();
    const { data: appConfig } = useAppConfig();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [locationName, setLocationName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'plan' | 'payment' | 'details'>('plan');
    const eventPlans = useMemo(() => publicAssignablePlans(appConfig?.planTiers ?? [], 'EVENT'), [appConfig?.planTiers]);
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');

    const fieldErrors = getFieldErrors(createEvent.error);
    const accountPlan = accountUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'ACCOUNT', accountUsage.planTier) : undefined;
    const nextAccountPlan = accountUsage ? findNextPlan(appConfig?.planTiers ?? [], 'ACCOUNT', accountUsage.planTier) : undefined;
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (!title.trim() || !startAt) return;

        const input: EventRequestDto = {
            title: title.trim(),
            planTierCode: selectedCode,
            eventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            endAt: endAt ? new Date(endAt).toISOString() : undefined,
            timezone,
            locationName: locationName.trim() || undefined,
            brandingSettings: {},
            isArchived: false,
        };

        try {
            const event = await createEvent.mutateAsync(input);
            setActiveEventId(event.id);
            router.push(routes.manage);
        } catch (err) {
            if (getErrorCode(err) === ERROR_CODES.ACTIVE_EVENT_LIMIT_EXCEEDED) {
                const details = getQuotaExceededDetails(err);
                const nextPlan = details ? findNextPlan(appConfig?.planTiers ?? [], 'ACCOUNT', details.planCode) : undefined;
                setError(nextPlan ? t('activeEventLimitExceededWithPlan', { plan: nextPlan.name }) : t('activeEventLimitExceeded'));
                return;
            }

            setError(getErrorMessage(err));
        }
    }

    const routeBack = useCallback(() => {
        router.back();
    }, [router]);

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    }, []);

    const onEventTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setEventType(e.target.value as EventTypeConvention);
    }, []);

    const onStartAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setStartAt(e.target.value);
    }, []);

    const onEndAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEndAt(e.target.value);
    }, []);

    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTimezone(e.target.value);
    }, []);

    const onLocationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocationName(e.target.value);
    }, []);

    const goToPayment = useCallback(() => {
        setStep('payment');
    }, []);

    const goToPlan = useCallback(() => {
        setStep('plan');
    }, []);

    const goToDetails = useCallback(() => {
        setStep('details');
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            <div className="flex items-center gap-3 py-4 mb-2">
                <button
                    onClick={routeBack}
                    aria-label={t('goBack')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base font-bold text-ink">{t('title')}</h1>
            </div>

            <div className="bg-card rounded-xl shadow-2xs p-5">
                <p className="text-sm text-ink-muted mb-5">
                    {step === 'plan' && t('steps.planSubtitle')}
                    {step === 'payment' && t('steps.paymentSubtitle')}
                    {step === 'details' && t('subtitle')}
                </p>

                {accountUsage && (
                    <UsagePanel
                        title={t('usageTitle')}
                        planName={accountPlan?.name ?? accountUsage.planTier}
                        nextPlanName={nextAccountPlan?.name}
                        className="mb-5"
                        items={[
                            {
                                key: 'activeEvents',
                                used: accountUsage.activeEvents,
                                limit: accountUsage.activeEventLimit,
                                percent: accountUsage.activeEventPercent,
                                valueLabel:
                                    accountUsage.activeEventLimit === null
                                        ? `${accountUsage.activeEvents}`
                                        : `${accountUsage.activeEvents} / ${accountUsage.activeEventLimit}`,
                            },
                        ]}
                    />
                )}

                <div className="mb-5 grid gap-2 text-xs font-semibold sm:grid-cols-3">
                    {(['plan', 'payment', 'details'] as const).map((item, index) => (
                        <div
                            key={item}
                            className={cn(
                                'rounded-full px-3 py-2 text-center transition',
                                step === item ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted'
                            )}
                        >
                            {index + 1}. {t(`steps.${item}`)}
                        </div>
                    ))}
                </div>

                {step === 'plan' && (
                    <EventPlanSelector plans={eventPlans} selectedCode={selectedCode} onSelect={setSelectedPlanCode} onContinue={goToPayment} />
                )}

                {step === 'payment' && (
                    <EventPlanPaymentStep plan={selectedPlan} selectedCode={selectedCode} onBack={goToPlan} onContinue={goToDetails} />
                )}

                {step === 'details' && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {selectedPlan && (
                            <div className="rounded-xl bg-primary-light px-4 py-3 text-sm text-primary-dark">
                                {t('selectedPlan', { plan: selectedPlan.name })}
                            </div>
                        )}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.title')}</span>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={onTitleChange}
                                placeholder={t('placeholders.title')}
                                className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                            />
                            {fieldErrors?.title && <span className="text-xs text-rose-500">{fieldErrors.title}</span>}
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.eventType')}</span>
                            <div className="relative">
                                <select
                                    value={eventType}
                                    onChange={onEventTypeChange}
                                    className="w-full appearance-none bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition pr-10"
                                >
                                    {EVENT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {t(`eventTypes.${type}`)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                            </div>
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.startAt')}</span>
                                <input
                                    type="datetime-local"
                                    required
                                    value={startAt}
                                    onChange={onStartAtChange}
                                    className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.endAt')}</span>
                                <input
                                    type="datetime-local"
                                    value={endAt}
                                    onChange={onEndAtChange}
                                    className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                                />
                            </label>
                        </div>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.timezone')}</span>
                            <input
                                type="text"
                                required
                                value={timezone}
                                onChange={onTimezoneChange}
                                className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30 transition"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('fields.locationName')}</span>
                            <input
                                type="text"
                                value={locationName}
                                onChange={onLocationNameChange}
                                placeholder={t('placeholders.locationName')}
                                className="bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                            />
                        </label>

                        {error && <p className="text-xs text-rose-500 text-center">{error}</p>}

                        <button
                            type="submit"
                            disabled={createEvent.isPending || !title.trim() || !startAt}
                            className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {createEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('submit')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
