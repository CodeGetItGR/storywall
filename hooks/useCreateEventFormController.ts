'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { usePreviewCreateEventCode } from '@/hooks/useBilling';
import { useCreateEvent } from '@/hooks/useEvent';
import { useMe } from '@/hooks/useMe';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getFieldErrors } from '@/lib/api/errors';
import type { CheckoutResponseDto, CollaborationCodePreviewResponseDto, EventRequestDto, EventTypeConvention } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { getScheduleDatetimeLocalBounds, isDatetimeLocalAfter, isDatetimeLocalBefore } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { getCurrentTimezone, getSupportedTimezones } from '@/lib/timezones';
import type { CreateEventFormValue, CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

export const CREATE_EVENT_FORM_ID = 'create-event-form';
const CREATE_EVENT_STEPS: CreateEventStep[] = ['type', 'plan', 'details', 'overview'];

function parseCreateEventStep(value: string | null): CreateEventStep {
    return CREATE_EVENT_STEPS.find((step) => step === value) ?? 'type';
}

export function useCreateEventFormController(): CreateEventFormValue {
    const t = useTranslations('CreateEventPage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    useMe();
    // Fail closed: submission stays blocked until we positively know the
    // account is verified. `user.emailVerified` is `null` until /api/me
    // resolves, so an in-flight or failed fetch must not read as "verified".
    // (The entry point itself — the home screen's Create Event action — is
    // where an unverified account is stopped and told why; this is a
    // defense-in-depth backstop for anyone who still reaches this route.)
    const isEmailVerified = user?.emailVerified === true;
    const createEvent = useCreateEvent();
    const previewCreateEventCode = usePreviewCreateEventCode();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();
    const consent = useWithdrawalConsent();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [timezone, setTimezone] = useState(getCurrentTimezone);
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanCode, setSelectedPlanCode] = useState('');
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);
    const [checkoutCode, setCheckoutCode] = useState('');
    const [appliedCheckoutCode, setAppliedCheckoutCode] = useState<string | null>(null);
    const [checkoutCodePreview, setCheckoutCodePreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [checkoutCodeError, setCheckoutCodeError] = useState<string | null>(null);
    const [isCheckoutPending, setIsCheckoutPending] = useState(false);

    const step = parseCreateEventStep(searchParams.get('step'));
    const eventTypes = appConfig?.eventTypes ?? [];
    const modules = appConfig?.modules ?? [];

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
    const { startAtMin, startAtMax, endAtMin } = getScheduleDatetimeLocalBounds({ startAt, endAt });
    const scheduleError =
        startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? t('validation.startInPast')
            : startAt && endAt && !isDatetimeLocalAfter(endAt, startAt)
              ? t('validation.endBeforeStart')
              : null;
    const timezoneError = timezone && !isTimezoneValid ? t('validation.invalidTimezone') : null;
    const trimmedTitle = title.trim();
    const trimmedLocationName = locationName.trim();
    const trimmedLocationAddress = locationAddress.trim();

    const canReachPlan = eventTypes.length > 0;
    const canReachDetails = canReachPlan && Boolean(selectedCode);
    const canSubmitDetails = Boolean(
        trimmedTitle && startAt && endAt && isTimezoneValid && !scheduleError && trimmedLocationName && trimmedLocationAddress
    );
    const canReachOverview = canReachDetails && canSubmitDetails;
    const reachableStep: CreateEventStep = canReachOverview ? 'overview' : canReachDetails ? 'details' : canReachPlan ? 'plan' : 'type';

    const goToStep = useCallback(
        (nextStep: CreateEventStep) => {
            router.push(routes.events.new({ step: nextStep }), { scroll: false });
        },
        [router]
    );

    const goToType = useCallback(() => goToStep('type'), [goToStep]);
    const goToPlan = useCallback(() => goToStep('plan'), [goToStep]);
    const goToDetails = useCallback(() => goToStep('details'), [goToStep]);

    useEffect(() => {
        if (step === 'type') {
            void refetchAppConfig();
        }
    }, [refetchAppConfig, step]);

    useEffect(() => {
        if (CREATE_EVENT_STEPS.indexOf(step) <= CREATE_EVENT_STEPS.indexOf(reachableStep)) return;
        router.replace(routes.events.new({ step: reachableStep }));
    }, [reachableStep, router, step]);

    const onSelectEventType = useCallback(
        (type: EventTypeConvention) => {
            if (type === eventType) return;
            setEventType(type);
            setSelectedPlanCode('');
            setTitle('');
            setStartAt('');
            setEndAt('');
            setTimezone(getCurrentTimezone());
            setLocationName('');
            setLocationAddress('');
            setMapsUrl('');
            setError(null);
            setCreatedDraftEventId(null);
            setCheckoutCode('');
            setIsCheckoutPending(false);
        },
        [eventType]
    );

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const onStartAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartAt(e.target.value), []);
    const onEndAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndAt(e.target.value), []);
    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTimezone(e.target.value), []);
    const onLocationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationName(e.target.value), []);
    const onLocationAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationAddress(e.target.value), []);
    const onMapsUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMapsUrl(e.target.value), []);

    const onCheckoutCodeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setCheckoutCode(e.target.value);
            setAppliedCheckoutCode(null);
            setCheckoutCodePreview(null);
            setCheckoutCodeError(null);
            previewCreateEventCode.reset();
            setError(null);
        },
        [previewCreateEventCode]
    );

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
        } catch (err) {
            setCheckoutCodeError(toErrorMessage(err, t('collaboration.invalid')));
        }
    }, [checkoutCode, previewCreateEventCode, selectedCode, selectedEventType, t, toErrorMessage]);

    const handleSubmit = useCallback(
        async (e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            if (step === 'details') {
                if (canSubmitDetails) goToStep('overview');
                return;
            }
            if (step !== 'overview') return;
            if (!isEmailVerified || !consent.consentSatisfied) return;

            let eventId = createdDraftEventId;

            if (!eventId) {
                if (!canSubmitDetails) return;

                const input: EventRequestDto = {
                    title: trimmedTitle,
                    planTierCode: selectedCode,
                    eventType: selectedEventType,
                    visibility: 'PRIVATE',
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                    timezone,
                    locationName: trimmedLocationName,
                    locationAddress: trimmedLocationAddress,
                    mapsUrl: mapsUrl.trim() || undefined,
                    brandingSettings: {},
                    initialSessionTitle,
                };

                try {
                    setIsCheckoutPending(true);
                    const event = await createEvent.mutateAsync(input);
                    eventId = event.id;
                    setCreatedDraftEventId(event.id);
                } catch (err) {
                    setIsCheckoutPending(false);
                    if (Object.keys(getFieldErrors(err) ?? {}).length > 0) {
                        goToStep('details');
                        return;
                    }
                    setError(toErrorMessage(err));
                    return;
                }
            }

            setIsCheckoutPending(true);
            try {
                const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), {
                    ...(appliedCheckoutCode ? { collaborationCode: appliedCheckoutCode } : {}),
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion!,
                });
                navigateToCheckout(eventId, checkout);
            } catch (checkoutError) {
                setIsCheckoutPending(false);
                if (consent.handleCheckoutError(checkoutError)) return;
                setError(toErrorMessage(checkoutError));
            }
        },
        [
            appliedCheckoutCode,
            canSubmitDetails,
            consent,
            createEvent,
            createdDraftEventId,
            goToStep,
            initialSessionTitle,
            isEmailVerified,
            mapsUrl,
            selectedCode,
            selectedEventType,
            step,
            timezone,
            toErrorMessage,
            trimmedLocationAddress,
            trimmedLocationName,
            trimmedTitle,
            startAt,
            endAt,
        ]
    );

    return {
        formId: CREATE_EVENT_FORM_ID,
        step,
        handleSubmit,
        goToStep,
        goToType,
        goToPlan,
        goToDetails,

        eventTypes,
        selectedEventType,
        onSelectEventType,
        canContinueType: canReachPlan,

        eventPlans,
        modules,
        selectedCode,
        selectedPlan,
        onSelectPlan: setSelectedPlanCode,
        isPlansLoading: planTiersQuery.isLoading,
        canContinuePlan: Boolean(selectedCode),

        title,
        titleError: fieldErrors?.title,
        onTitleChange,
        startAt,
        startAtMin,
        startAtMax,
        endAt,
        endAtMin,
        scheduleError,
        onStartAtChange,
        onEndAtChange,
        timezone,
        timezoneOptions,
        timezoneError,
        onTimezoneChange,
        locationName,
        locationNameError: fieldErrors?.locationName,
        onLocationNameChange,
        locationAddress,
        locationAddressError: fieldErrors?.locationAddress,
        onLocationAddressChange,
        mapsUrl,
        onMapsUrlChange,
        canSubmitDetails,

        trimmedTitle,
        error,
        hasDraft: Boolean(createdDraftEventId),
        checkoutCode,
        appliedCheckoutCode,
        checkoutCodePreview,
        checkoutCodeError,
        isCheckingCheckoutCode: previewCreateEventCode.isPending,
        onCheckoutCodeChange,
        applyCheckoutCode,

        requestsImmediateStart: consent.requestsImmediateStart,
        acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
        staleTerms: consent.staleTerms,
        consentSatisfied: consent.consentSatisfied,
        onRequestsImmediateStartChange: consent.handleRequestsImmediateStartChange,
        onAcknowledgesWithdrawalTermsChange: consent.handleAcknowledgesWithdrawalTermsChange,

        isSubmitPending: createEvent.isPending || isCheckoutPending,
        isEmailVerified,
    };
}
