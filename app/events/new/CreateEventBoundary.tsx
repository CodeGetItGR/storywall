'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { CreateEventRouteState } from '@/components/event/create/CreateEventRouteState';
import { EventAddonsStep } from '@/components/event/create/EventAddonsStep';
import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { EventCreateStepBreadcrumb } from '@/components/event/create/EventCreateStepBreadcrumb';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventTypeStep } from '@/components/event/create/EventTypeStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEvent } from '@/hooks/useEvent';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type {
    CheckoutResponseDto,
    EventAddonDto,
    EventAddonRequestDto,
    EventRequestDto,
    EventResponseDto,
    EventTypeConvention,
} from '@/lib/api/types';
import { formatMoney, navigateToCheckout } from '@/lib/billing';
import { getCurrentDatetimeLocalValue, getLaterDatetimeLocalValue, isDatetimeLocalAfter, isDatetimeLocalBefore } from '@/lib/datetime';
import { publicAssignableEventAddons } from '@/lib/planModules';
import { getPlanPriceDetails } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

type CreateEventStep = 'type' | 'plan' | 'addons' | 'details' | 'overview';

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
    const [step, setStep] = useState<CreateEventStep>('type');
    const eventTypes = appConfig?.eventTypes ?? [];
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
    const [selectedAddonCodes, setSelectedAddonCodes] = useState<string[]>([]);
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedEventType = eventTypes.find((type) => type.eventTypeKey === eventType)?.eventTypeKey ?? eventTypes[0]?.eventTypeKey ?? eventType;
    const planTiersQuery = usePlanTiersForEventType(selectedEventType, isAuthenticated);
    const eventPlans = useMemo(() => planTiersQuery.data ?? [], [planTiersQuery.data]);
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const availableAddons = useMemo(
        () => publicAssignableEventAddons(appConfig?.paidServices ?? [], appConfig?.modules ?? [], selectedPlan),
        [appConfig?.modules, appConfig?.paidServices, selectedPlan]
    );
    const selectedAddonServices = availableAddons.filter((service) => selectedAddonCodes.includes(service.code));
    const selectedEligibleAddonCodes = selectedAddonServices.map((service) => service.code);
    const nowAt = getCurrentDatetimeLocalValue();
    const startAtMax = isDatetimeLocalAfter(endAt, nowAt) ? endAt : undefined;
    const endAtMin = getLaterDatetimeLocalValue(nowAt, startAt) ?? nowAt;
    const scheduleError =
        startAt && isDatetimeLocalBefore(startAt, nowAt)
            ? t('validation.startInPast')
            : startAt && endAt && !isDatetimeLocalAfter(endAt, startAt)
              ? t('validation.endBeforeStart')
              : null;
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
        if (step === 'type') {
            void refetchAppConfig();
        }
    }, [refetchAppConfig, step]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (step === 'details') {
            if (title.trim() && startAt && endAt && !scheduleError) setStep('overview');
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
        if (!title.trim() || !startAt || !endAt || scheduleError) return;

        const input: EventRequestDto = {
            title: title.trim(),
            planTierCode: selectedCode,
            eventType: selectedEventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            timezone,
            locationName: locationName.trim() || undefined,
            brandingSettings: {},
        };

        let event: EventResponseDto | null = null;

        try {
            event = await createEvent.mutateAsync(input);
            setActiveEventId(event.id);

            for (const service of selectedAddonServices) {
                const addonInput: EventAddonRequestDto = { paidServiceCode: service.code };
                await api.post<EventAddonDto>(endpoints.events.addons(event.id), addonInput);
            }
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
            return;
        }

        try {
            const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(event.id));
            navigateToCheckout(event.id, checkout);
        } catch (checkoutError) {
            setCreatedDraftEventId(event.id);
            setError(toErrorMessage(checkoutError));
        }
    }

    const routeBack = useCallback(() => {
        router.back();
    }, [router]);

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    }, []);

    const onSelectEventType = useCallback(
        (type: EventTypeConvention) => {
            if (type === eventType) return;
            setEventType(type);
            setSelectedPlanCode('');
            setSelectedAddonCodes([]);
            setTitle('');
            setStartAt('');
            setEndAt('');
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
            setLocationName('');
            setError(null);
            setCreatedDraftEventId(null);
        },
        [eventType]
    );

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

    const goToType = useCallback(() => {
        setStep('type');
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

                        {/* Steps */}
                        <EventCreateStepBreadcrumb
                            step={step}
                            onGoToTypeAction={goToType}
                            onGoToPlanAction={goToPlan}
                            onGoToAddonsAction={goToAddons}
                            onGoToDetailsAction={goToDetails}
                        />

                        {/* Form Shell */}
                        <div className="mt-3 min-h-0 flex-1 overflow-y-auto p-5">
                            <form id={CREATE_EVENT_FORM_ID} onSubmit={handleSubmit}>
                                {/* Subtitle */}
                                <h2 className="text-lg font-bold text-ink mb-5">
                                    {step === 'type' && t('steps.typeSubtitle')}
                                    {step === 'plan' && t('steps.planSubtitle')}
                                    {step === 'addons' && t('steps.addonsSubtitle')}
                                    {step === 'details' && t('subtitle')}
                                    {step === 'overview' && t('steps.overviewSubtitle')}
                                </h2>

                                {step === 'type' && (
                                    <EventTypeStep eventTypes={eventTypes} selectedEventType={selectedEventType} onSelectAction={onSelectEventType} />
                                )}

                                {step === 'plan' && (
                                    <EventPlanSelector
                                        plans={eventPlans}
                                        modules={appConfig?.modules ?? []}
                                        selectedCode={selectedCode}
                                        onSelectAction={setSelectedPlanCode}
                                        isLoading={planTiersQuery.isLoading}
                                    />
                                )}

                                {step === 'addons' && (
                                    <EventAddonsStep
                                        modules={appConfig?.modules ?? []}
                                        services={availableAddons}
                                        selectedCodes={selectedEligibleAddonCodes}
                                        onToggleAction={toggleAddon}
                                    />
                                )}

                                {step === 'details' && (
                                    <EventDetailsStep
                                        eventType={selectedEventType}
                                        title={title}
                                        titleError={fieldErrors?.title}
                                        startAt={startAt}
                                        endAt={endAt}
                                        scheduleError={scheduleError}
                                        startAtMin={nowAt}
                                        startAtMax={startAtMax}
                                        endAtMin={endAtMin}
                                        timezone={timezone}
                                        locationName={locationName}
                                        onTitleChangeAction={onTitleChange}
                                        onStartAtChangeAction={onStartAtChange}
                                        onEndAtChangeAction={onEndAtChange}
                                        onTimezoneChangeAction={onTimezoneChange}
                                        onLocationNameChangeAction={onLocationNameChange}
                                    />
                                )}

                                {step === 'overview' && selectedPlan && (
                                    <EventOverviewStep
                                        title={title.trim()}
                                        eventType={selectedEventType}
                                        eventTypes={eventTypes}
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
                        canContinueType={eventTypes.length > 0}
                        canContinue={Boolean(selectedCode)}
                        isPending={createEvent.isPending}
                        hasDraft={Boolean(createdDraftEventId)}
                        payAmountLabel={overviewPayAmountLabel}
                        canSubmitDetails={Boolean(title.trim() && startAt && endAt && !scheduleError)}
                        onGoToTypeAction={goToType}
                        onGoToAddonsAction={goToAddons}
                        onGoToDetailsAction={goToDetails}
                        onGoToPlanAction={goToPlan}
                    />
                </main>
            }
        />
    );
}
