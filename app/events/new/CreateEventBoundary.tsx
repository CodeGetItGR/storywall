'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EventAddonsStep } from '@/components/event/create/EventAddonsStep';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEvent } from '@/hooks/useEvent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type { EventAddonDto, EventAddonRequestDto, EventRequestDto, EventResponseDto, EventTypeConvention } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { publicAssignableEventAddons } from '@/lib/planModules';
import { getPlanPriceDetails, publicAssignablePlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

const CREATE_EVENT_FORM_ID = 'create-event-form';

export default function CreateEventPage() {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const router = useRouter();
    const { user, isAuthenticated, isBootstrapping } = useAuth();
    const { setActiveEventId } = useEventSwitcher();
    const createEvent = useCreateEvent();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [locationName, setLocationName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'plan' | 'addons' | 'details' | 'overview'>('plan');
    const eventPlans = useMemo(() => publicAssignablePlans(appConfig?.planTiers ?? [], 'EVENT'), [appConfig?.planTiers]);
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
    const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([]);
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const availableAddons = useMemo(
        () => publicAssignableEventAddons(appConfig?.paidServices ?? [], appConfig?.modules ?? [], selectedPlan),
        [appConfig?.modules, appConfig?.paidServices, selectedPlan]
    );
    const selectedAddonServices = availableAddons.filter((service) => selectedAddonCodes.includes(service.code));
    const selectedEligibleAddonCodes = selectedAddonServices.map((service) => service.code);
    const overviewPayAmountLabel = useMemo(() => {
        if (!selectedPlan) return t('payment.noCharge');

        const includedMonths = selectedPlan.includedMonths ?? 1;
        const activation = getPlanPriceDetails(selectedPlan, 'activation');
        const recurring = getPlanPriceDetails(selectedPlan, 'recurring');
        const recurringAddons = selectedAddonServices.filter((addon) => addon.billingPeriod === 'MONTHLY');
        const oneTimeAddons = selectedAddonServices.filter((addon) => addon.billingPeriod === 'ONE_TIME');
        const activationAddonTotal =
            recurringAddons.reduce((sum, addon) => sum + addon.priceAmountMinor * includedMonths, 0) +
            oneTimeAddons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
        const activationTotal = (activation?.amountMinor ?? 0) + activationAddonTotal;
        const currency = activation?.currency ?? recurring?.currency ?? selectedAddonServices[0]?.priceCurrency;

        return currency ? formatMoney(locale, activationTotal, currency) : t('payment.noCharge');
    }, [locale, selectedAddonServices, selectedPlan, t]);

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated) {
            router.replace(routes.login);
            return;
        }
        if (user?.role === 'ADMIN') router.replace(routes.admin);
    }, [isAuthenticated, isBootstrapping, router, user?.role]);

    useEffect(() => {
        if (step === 'plan') {
            void refetchAppConfig();
        }
    }, [refetchAppConfig, step]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (step === 'details') {
            if (title.trim() && startAt && endAt) setStep('overview');
            return;
        }
        if (step === 'addons') {
            return;
        }
        if (step !== 'overview') return;
        if (createdDraftEventId) {
            router.push(routes.manage);
            return;
        }
        if (!title.trim() || !startAt || !endAt) return;

        const input: EventRequestDto = {
            title: title.trim(),
            planTierCode: selectedCode,
            eventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            timezone,
            locationName: locationName.trim() || undefined,
            brandingSettings: {},
            isArchived: false,
        };

        let event: EventResponseDto | null = null;

        try {
            event = await createEvent.mutateAsync(input);
            setActiveEventId(event.id);

            for (const service of selectedAddonServices) {
                const addonInput: EventAddonRequestDto = { paidServiceCode: service.code };
                await api.post<EventAddonDto>(endpoints.events.addons(event.id), addonInput);
            }

            router.push(routes.events.checkoutReview(event.id, 'activation'));
        } catch (err) {
            if (event) {
                setCreatedDraftEventId(event.id);
                setError(t('paidModules.applyFailed'));
                return;
            }

            if (Object.keys(getFieldErrors(err) ?? {}).length > 0) {
                setStep('details');
                return;
            }

            if (getErrorCode(err) === ERROR_CODES.ACTIVE_EVENT_LIMIT_EXCEEDED) {
                setError(t('activeEventLimitExceeded'));
                return;
            }

            setError(toErrorMessage(err));
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

    const goToAddons = useCallback(() => {
        setStep('addons');
    }, []);

    const goToPlan = useCallback(() => {
        setStep('plan');
    }, []);

    const goToDetails = useCallback(() => {
        setStep('details');
    }, []);

    const toggleAddon = useCallback((code: string) => {
        setSelectedAddonCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
    }, []);

    return (
        <CreateEventRouteState
            isBlocked={isBootstrapping || !isAuthenticated || user?.role === 'ADMIN'}
            content={
                <main className="flex h-full flex-col bg-background">
                    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
                        {/* Header */}
                        <div className="flex shrink-0 items-center gap-3 py-4">
                            <button
                                onClick={routeBack}
                                aria-label={t('goBack')}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                        </div>

                        {/* Form Shell */}
                        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-card p-5 shadow-2xs">
                            <form id={CREATE_EVENT_FORM_ID} onSubmit={handleSubmit}>
                                {/* Subtitle */}
                                <p className="mb-5 text-sm text-ink-muted">
                                    {step === 'plan' && t('steps.planSubtitle')}
                                    {step === 'addons' && t('steps.addonsSubtitle')}
                                    {step === 'details' && t('subtitle')}
                                    {step === 'overview' && t('steps.overviewSubtitle')}
                                </p>

                                {/* Steps */}
                                <div className="mb-5 grid grid-cols-4 gap-1.5 text-[11px] font-semibold sm:gap-2 sm:text-xs">
                                    {(['plan', 'addons', 'details', 'overview'] as const).map((item) => (
                                        <div
                                            key={item}
                                            className={`rounded-full px-1.5 py-2 text-center transition sm:px-3 ${
                                                step === item ? 'bg-ink text-white' : 'bg-surface-muted text-ink-muted'
                                            }`}
                                        >
                                            {t(`steps.${item}`)}
                                        </div>
                                    ))}
                                </div>

                                {step === 'plan' && (
                                    <EventPlanSelector
                                        plans={eventPlans}
                                        modules={appConfig?.modules ?? []}
                                        selectedCode={selectedCode}
                                        onSelect={setSelectedPlanCode}
                                    />
                                )}

                                {step === 'addons' && (
                                    <EventAddonsStep
                                        modules={appConfig?.modules ?? []}
                                        services={availableAddons}
                                        selectedCodes={selectedEligibleAddonCodes}
                                        onToggle={toggleAddon}
                                    />
                                )}

                                {step === 'details' && (
                                    <EventDetailsStep
                                        selectedPlan={selectedPlan}
                                        title={title}
                                        titleError={fieldErrors?.title}
                                        eventType={eventType}
                                        startAt={startAt}
                                        endAt={endAt}
                                        timezone={timezone}
                                        locationName={locationName}
                                        onTitleChange={onTitleChange}
                                        onEventTypeChange={onEventTypeChange}
                                        onStartAtChange={onStartAtChange}
                                        onEndAtChange={onEndAtChange}
                                        onTimezoneChange={onTimezoneChange}
                                        onLocationNameChange={onLocationNameChange}
                                    />
                                )}

                                {step === 'overview' && selectedPlan && (
                                    <EventOverviewStep
                                        title={title.trim()}
                                        eventType={eventType}
                                        startAt={startAt}
                                        endAt={endAt}
                                        locationName={locationName.trim()}
                                        plan={selectedPlan}
                                        modules={appConfig?.modules ?? []}
                                        addons={selectedAddonServices}
                                        error={error}
                                        hasDraft={Boolean(createdDraftEventId)}
                                    />
                                )}
                            </form>
                        </div>
                    </div>
                    <EventCreateFooter
                        step={step}
                        formId={CREATE_EVENT_FORM_ID}
                        canContinue={Boolean(selectedCode)}
                        isPending={createEvent.isPending}
                        hasDraft={Boolean(createdDraftEventId)}
                        payAmountLabel={overviewPayAmountLabel}
                        title={title}
                        startAt={startAt}
                        endAt={endAt}
                        onGoToAddons={goToAddons}
                        onGoToDetails={goToDetails}
                        onGoToPlan={goToPlan}
                    />
                </main>
            }
        />
    );
}

function CreateEventRouteState({ content, isBlocked }: { content: React.ReactNode; isBlocked: boolean }) {
    if (!isBlocked) {
        return content;
    }

    return (
        <main className="flex h-full items-center justify-center bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
        </main>
    );
}

function EventCreateFooter({
    step,
    formId,
    canContinue,
    isPending,
    hasDraft,
    payAmountLabel,
    title,
    startAt,
    endAt,
    onGoToAddons,
    onGoToDetails,
    onGoToPlan,
}: {
    step: 'plan' | 'addons' | 'details' | 'overview';
    formId: string;
    canContinue: boolean;
    isPending: boolean;
    hasDraft: boolean;
    payAmountLabel: string;
    title: string;
    startAt: string;
    endAt: string;
    onGoToAddons: () => void;
    onGoToDetails: () => void;
    onGoToPlan: () => void;
}) {
    const t = useTranslations('CreateEventPage');
    const canSubmitDetails = Boolean(title.trim() && startAt && endAt);

    return (
        <footer className="shrink-0 border-t border-border/60 bg-background">
            <div className="mx-auto w-full max-w-2xl px-4 py-4">
                {step === 'plan' && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={!canContinue}
                            onClick={onGoToAddons}
                            className="min-h-11 rounded-full bg-gradient-brand px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToAddons')}
                        </button>
                    </div>
                )}

                {step === 'addons' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onGoToPlan}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            type="button"
                            onClick={onGoToDetails}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            {t('continueToDetails')}
                        </button>
                    </div>
                )}

                {step === 'details' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onGoToAddons}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            form={formId}
                            type="submit"
                            disabled={!canSubmitDetails}
                            className="min-h-11 flex-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {t('continueToOverview')}
                        </button>
                    </div>
                )}

                {step === 'overview' && (
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onGoToDetails}
                            disabled={isPending}
                            className="min-h-11 flex-1 rounded-full border border-border text-sm font-semibold text-ink"
                        >
                            {t('actions.back')}
                        </button>
                        <button
                            form={formId}
                            type="submit"
                            disabled={isPending}
                            className="flex min-h-11 flex-2 items-center justify-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : hasDraft ? (
                                t('paidModules.openDraft')
                            ) : (
                                t('submitAndPay', { amount: payAmountLabel })
                            )}
                        </button>
                    </div>
                )}
            </div>
        </footer>
    );
}
