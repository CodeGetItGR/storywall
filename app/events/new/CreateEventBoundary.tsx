'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { CreateEventRouteState } from '@/components/event/create/CreateEventRouteState';
import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { EventCreateStepBreadcrumb } from '@/components/event/create/EventCreateStepBreadcrumb';
import { EventDetailsStep } from '@/components/event/create/EventDetailsStep';
import { EventOverviewStep } from '@/components/event/create/EventOverviewStep';
import { EventTypeStep } from '@/components/event/create/EventTypeStep';
import { EventPlanSelector } from '@/components/plan/EventPlanSelector';
import { BackButton } from '@/components/ui/BackButton';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { usePreviewCreateEventCode } from '@/hooks/useBilling';
import { useCreateEvent } from '@/hooks/useEvent';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getFieldErrors } from '@/lib/api/errors';
import type { CheckoutResponseDto, CollaborationCodePreviewResponseDto, EventRequestDto, EventResponseDto, EventTypeConvention } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { getScheduleDatetimeLocalBounds, isDatetimeLocalBefore } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { getCurrentTimezone, getSupportedTimezones } from '@/lib/timezones';

type CreateEventStep = 'type' | 'plan' | 'details' | 'overview';

const CREATE_EVENT_FORM_ID = 'create-event-form';
const CREATE_EVENT_STEPS: CreateEventStep[] = ['type', 'plan', 'details', 'overview'];

function parseCreateEventStep(value: string | null): CreateEventStep {
    return CREATE_EVENT_STEPS.find((step) => step === value) ?? 'type';
}

export default function CreateEventPage() {
    const t = useTranslations('CreateEventPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isBootstrapping } = useAuth();
    const createEvent = useCreateEvent();
    const previewCreateEventCode = usePreviewCreateEventCode();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [timezone, setTimezone] = useState(getCurrentTimezone);
    const [error, setError] = useState<string | null>(null);
    const step = parseCreateEventStep(searchParams.get('step'));
    const eventTypes = appConfig?.eventTypes ?? [];
    const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);
    const [checkoutCode, setCheckoutCode] = useState('');
    const [appliedCheckoutCode, setAppliedCheckoutCode] = useState<string | null>(null);
    const [checkoutCodePreview, setCheckoutCodePreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [checkoutCodeError, setCheckoutCodeError] = useState<string | null>(null);
    const [isCheckoutPending, setIsCheckoutPending] = useState(false);

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedEventType = eventTypes.find((type) => type.eventTypeKey === eventType)?.eventTypeKey ?? eventTypes[0]?.eventTypeKey ?? eventType;
    const planTiersQuery = usePlanTiersForEventType(selectedEventType, isAuthenticated);
    const eventPlans = useMemo(() => planTiersQuery.data ?? [], [planTiersQuery.data]);
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const initialSessionTitleKey = getCreateEventCatalogEntry(selectedEventType)?.initialSessionTitleKey;
    const initialSessionTitle = initialSessionTitleKey && t.has(initialSessionTitleKey) ? t(initialSessionTitleKey) : undefined;
    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(timezone);
    const { startAtMin } = getScheduleDatetimeLocalBounds({ startAt, endAt: null });
    const scheduleError = startAt && isDatetimeLocalBefore(startAt, startAtMin) ? t('validation.startInPast') : null;
    const timezoneError = timezone && !isTimezoneValid ? t('validation.invalidTimezone') : null;
    const canReachPlan = eventTypes.length > 0;
    const canReachDetails = canReachPlan && Boolean(selectedCode);
    const canReachOverview = canReachDetails && Boolean(title.trim() && startAt && isTimezoneValid && !scheduleError);
    const reachableStep: CreateEventStep = canReachOverview ? 'overview' : canReachDetails ? 'details' : canReachPlan ? 'plan' : 'type';
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

    useEffect(() => {
        if (CREATE_EVENT_STEPS.indexOf(step) <= CREATE_EVENT_STEPS.indexOf(reachableStep)) return;
        router.replace(routes.events.new({ step: reachableStep }));
    }, [reachableStep, router, step]);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (step === 'details') {
            if (title.trim() && startAt && isTimezoneValid && !scheduleError) goToStep('overview');
            return;
        }
        if (step !== 'overview') return;
        if (createdDraftEventId) {
            router.push(routes.events.manage(createdDraftEventId));
            return;
        }
        if (!title.trim() || !startAt || !isTimezoneValid || scheduleError) return;

        const input: EventRequestDto = {
            title: title.trim(),
            planTierCode: selectedCode,
            eventType: selectedEventType,
            visibility: 'PRIVATE',
            startAt: new Date(startAt).toISOString(),
            timezone,
            brandingSettings: {},
            initialSessionTitle,
        };

        let event: EventResponseDto | null = null;

        try {
            setIsCheckoutPending(true);
            event = await createEvent.mutateAsync(input);
        } catch (err) {
            setIsCheckoutPending(false);
            if (Object.keys(getFieldErrors(err) ?? {}).length > 0) {
                setStep('details');
                return;
            }

            setError(toErrorMessage(err));
            return;
        }

        try {
            const trimmedCheckoutCode = checkoutCode.trim();
            const checkout = await api.post<CheckoutResponseDto>(
                endpoints.events.checkout(event.id),
                appliedCheckoutCode ? { collaborationCode: appliedCheckoutCode } : undefined
            );
            window.history.replaceState(null, '', routes.events.new({ step: 'overview' }));
            navigateToCheckout(event.id, checkout);
        } catch (checkoutError) {
            setCreatedDraftEventId(event.id);
            setError(toErrorMessage(checkoutError));
            setIsCheckoutPending(false);
        }
    }

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    }, []);

    const onSelectEventType = useCallback(
        (type: EventTypeConvention) => {
            if (type === eventType) return;
            setEventType(type);
            setSelectedPlanCode('');
            setTitle('');
            setStartAt('');
            setTimezone(getCurrentTimezone());
            setError(null);
            setCreatedDraftEventId(null);
            setCheckoutCode('');
            setIsCheckoutPending(false);
        },
        [eventType]
    );

    const onStartAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setStartAt(e.target.value);
    }, []);

    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTimezone(e.target.value);
    }, []);

    const onCheckoutCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCheckoutCode(e.target.value);
        setAppliedCheckoutCode(null);
        setCheckoutCodePreview(null);
        setCheckoutCodeError(null);
        previewCreateEventCode.reset();
        setError(null);
    }, [previewCreateEventCode]);

    const applyCheckoutCode = useCallback(async () => {
        const trimmedCode = checkoutCode.trim();
        if (!trimmedCode || !selectedCode) return;
        setCheckoutCodeError(null);
        setAppliedCheckoutCode(null);
        setCheckoutCodePreview(null);

        try {
            const preview = await previewCreateEventCode.mutateAsync({
                eventType: selectedEventType,
                planTierCode: selectedCode,
                collaborationCode: trimmedCode,
            });
            setAppliedCheckoutCode(trimmedCode);
            setCheckoutCodePreview(preview);
        } catch {
            setCheckoutCodeError(t('collaboration.invalid'));
        }
    }, [checkoutCode, previewCreateEventCode, selectedCode, selectedEventType, t]);

    const goToStep = useCallback(
        (nextStep: CreateEventStep) => {
            router.push(routes.events.new({ step: nextStep }), { scroll: false });
        },
        [router]
    );

    const goToType = useCallback(() => {
        goToStep('type');
    }, [goToStep]);

    const goToPlan = useCallback(() => {
        goToStep('plan');
    }, [goToStep]);

    const goToDetails = useCallback(() => {
        goToStep('details');
    }, [goToStep]);

    return (
        <CreateEventRouteState
            isBlocked={isBootstrapping || !isAuthenticated || user?.role === 'ADMIN'}
            content={
                <main className="flex h-full flex-col bg-background">
                    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4">
                        {/* Header */}
                        <div className="flex shrink-0 items-center gap-3 py-4">
                            <BackButton variant="icon" href={routes.home} label={t('goBack')} />
                            <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                        </div>

                        {/* Steps */}
                        <EventCreateStepBreadcrumb
                            step={step}
                            onGoToTypeAction={goToType}
                            onGoToPlanAction={goToPlan}
                            onGoToDetailsAction={goToDetails}
                        />

                        {/* Form Shell */}
                        <div className="mt-3 min-h-0 flex-1 overflow-y-auto p-5">
                            <form id={CREATE_EVENT_FORM_ID} onSubmit={handleSubmit}>
                                {/* Subtitle */}
                                <h2 className="text-lg font-bold text-ink mb-5">
                                    {step === 'type' && t('steps.typeSubtitle')}
                                    {step === 'plan' && t('steps.planSubtitle')}
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

                                {step === 'details' && (
                                    <EventDetailsStep
                                        eventType={selectedEventType}
                                        title={title}
                                        titleError={fieldErrors?.title}
                                        startAt={startAt}
                                        scheduleError={scheduleError}
                                        startAtMin={startAtMin}
                                        timezone={timezone}
                                        timezoneError={timezoneError}
                                        timezoneOptions={timezoneOptions}
                                        onTitleChangeAction={onTitleChange}
                                        onStartAtChangeAction={onStartAtChange}
                                        onTimezoneChangeAction={onTimezoneChange}
                                    />
                                )}

                                {step === 'overview' && selectedPlan && (
                                    <EventOverviewStep
                                        title={title.trim()}
                                        eventType={selectedEventType}
                                        eventTypes={eventTypes}
                                        startAt={startAt}
                                        plan={selectedPlan}
                                        error={error}
                                        hasDraft={Boolean(createdDraftEventId)}
                                        checkoutCode={checkoutCode}
                                        appliedCheckoutCode={appliedCheckoutCode}
                                        checkoutCodePreview={checkoutCodePreview}
                                        checkoutCodeError={checkoutCodeError}
                                        isCheckingCheckoutCode={previewCreateEventCode.isPending}
                                        onCheckoutCodeChangeAction={onCheckoutCodeChange}
                                        onApplyCheckoutCodeAction={applyCheckoutCode}
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
                        isPending={createEvent.isPending || isCheckoutPending}
                        hasDraft={Boolean(createdDraftEventId)}
                        canSubmitDetails={Boolean(title.trim() && startAt && isTimezoneValid && !scheduleError)}
                        onGoToTypeAction={goToType}
                        onGoToDetailsAction={goToDetails}
                        onGoToPlanAction={goToPlan}
                    />
                </main>
            }
        />
    );
}
