'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { usePreviewCreateEventCode } from '@/hooks/useBilling';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvent';
import { useMe } from '@/hooks/useMe';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type { CheckoutResponseDto, CollaborationCodePreviewResponseDto, EventRequestDto, EventTypeConvention } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { getScheduleDatetimeLocalBounds, isDatetimeLocalAfter, isDatetimeLocalBefore } from '@/lib/datetime';
import { projectCoverage } from '@/lib/eventCoverage';
import { liveInitialOptions, resolveInitialOption } from '@/lib/planTiers';
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
    const durationPicks = useDurationPicks();
    const previewCreateEventCode = usePreviewCreateEventCode();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();
    const consent = useWithdrawalConsent();

    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventTypeConvention>('WEDDING');
    const [startAt, setStartAt] = useState('');
    const [timezone, setTimezone] = useState(getCurrentTimezone);
    const [locationName, setLocationName] = useState('');
    const [locationAddress, setLocationAddress] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanCode, setSelectedPlanCode] = useState('');
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);
    // What the draft was created with, so a duration changed afterwards is
    // saved to it before checkout.
    const [createdDraftSelection, setCreatedDraftSelection] = useState<{ planCode: string; optionId: string } | null>(null);
    const updateDraft = useUpdateEvent(createdDraftEventId);
    const [checkoutCode, setCheckoutCode] = useState('');
    const [appliedCheckoutCode, setAppliedCheckoutCode] = useState<string | null>(null);
    const [checkoutCodePreview, setCheckoutCodePreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [checkoutCodeError, setCheckoutCodeError] = useState<string | null>(null);
    const [isCheckoutPending, setIsCheckoutPending] = useState(false);

    useResetOnBfcacheRestore(
        useCallback(() => {
            createEvent.reset();
            setIsCheckoutPending(false);
        }, [createEvent]),
    );

    const step = parseCreateEventStep(searchParams.get('step'));
    // Public config should already contain only enabled rows. Keep the picker
    // fail-closed if a stale or malformed response includes a disabled type.
    const eventTypes = appConfig?.eventTypes.filter((eventType) => eventType.isEnabled) ?? [];
    const modules = appConfig?.modules ?? [];
    const media = appConfig?.media ?? null;

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedEventType = eventTypes.find((type) => type.eventTypeKey === eventType)?.eventTypeKey ?? eventTypes[0]?.eventTypeKey ?? eventType;
    const planTiersQuery = usePlanTiersForEventType(selectedEventType, isAuthenticated);
    // A plan with no duration on sale can't be bought, so it isn't offered.
    const eventPlans = useMemo(() => (planTiersQuery.data ?? []).filter((plan) => liveInitialOptions(plan).length > 0), [planTiersQuery.data]);
    const selectedPlan = eventPlans.find((plan) => plan.code === selectedPlanCode) ?? eventPlans[0];
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const selectedOption = selectedPlan ? resolveInitialOption(selectedPlan, durationPicks.picks[selectedPlan.code]) : null;
    const initialSessionTitleKey = getCreateEventCatalogEntry(selectedEventType)?.initialSessionTitleKey;
    const initialSessionTitle = initialSessionTitleKey && t.has(initialSessionTitleKey) ? t(initialSessionTitleKey) : undefined;
    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(timezone);
    // The server fills endAt (startAt + 24h) when it is omitted; the form only asks for a start.
    const { startAtMin, startAtMax } = getScheduleDatetimeLocalBounds({ startAt, maxLeadDays: appConfig?.coverage.maxLeadDays });
    const scheduleError =
        startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? t('validation.startInPast')
            : startAt && isDatetimeLocalAfter(startAt, startAtMax)
              ? t('validation.startTooFarAhead')
              : null;
    // No event exists yet, so there is no server projection to read; estimate
    // from the start and the picked duration instead.
    const projectedCoverage = useMemo(
        () => (scheduleError ? null : projectCoverage({ startAt: startAt || null, hostingMonths: selectedOption?.months })),
        [scheduleError, startAt, selectedOption?.months],
    );
    const timezoneError = timezone && !isTimezoneValid ? t('validation.invalidTimezone') : null;
    const trimmedTitle = title.trim();
    const trimmedLocationName = locationName.trim();
    const trimmedLocationAddress = locationAddress.trim();

    const canReachPlan = eventTypes.length > 0;
    const canReachDetails = canReachPlan && Boolean(selectedCode && selectedOption);
    const canSubmitDetails = Boolean(trimmedTitle && startAt && isTimezoneValid && !scheduleError && trimmedLocationName && trimmedLocationAddress);
    const canReachOverview = canReachDetails && canSubmitDetails;
    const reachableStep: CreateEventStep = canReachOverview ? 'overview' : canReachDetails ? 'details' : canReachPlan ? 'plan' : 'type';

    const goToStep = useCallback(
        (nextStep: CreateEventStep) => {
            router.push(routes.events.new({ step: nextStep }), { scroll: false });
        },
        [router],
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
            setTimezone(getCurrentTimezone());
            setLocationName('');
            setLocationAddress('');
            setMapsUrl('');
            setError(null);
            setCreatedDraftEventId(null);
            setCreatedDraftSelection(null);
            durationPicks.resetPicks();
            setCheckoutCode('');
            setIsCheckoutPending(false);
        },
        [durationPicks, eventType],
    );

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const onStartAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartAt(e.target.value), []);
    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTimezone(e.target.value), []);
    const onLocationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationName(e.target.value), []);
    const onLocationAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationAddress(e.target.value), []);
    const onMapsUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMapsUrl(e.target.value), []);

    // A code preview prices one plan at one duration, so it goes stale when
    // either changes. The typed code stays so the host can apply it again.
    const clearCheckoutCodePreview = useCallback(() => {
        setAppliedCheckoutCode(null);
        setCheckoutCodePreview(null);
        setCheckoutCodeError(null);
        previewCreateEventCode.reset();
    }, [previewCreateEventCode]);

    const onSelectPlan = useCallback(
        (code: string) => {
            if (code !== selectedCode) clearCheckoutCodePreview();
            setSelectedPlanCode(code);
        },
        [clearCheckoutCodePreview, selectedCode],
    );

    // Picking a duration on a card also picks that card's plan.
    const onSelectPlanDuration = useCallback(
        (code: string, optionId: string) => {
            if (code !== selectedCode || optionId !== selectedOption?.id) clearCheckoutCodePreview();
            setSelectedPlanCode(code);
            durationPicks.pickDuration(code, optionId);
        },
        [clearCheckoutCodePreview, durationPicks, selectedCode, selectedOption?.id],
    );

    const onCheckoutCodeChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setCheckoutCode(e.target.value);
            clearCheckoutCodePreview();
            setError(null);
        },
        [clearCheckoutCodePreview],
    );

    const applyCheckoutCode = useCallback(async () => {
        const trimmedCode = checkoutCode.trim();
        if (!trimmedCode || !selectedCode || !selectedOption) return;
        setCheckoutCodeError(null);
        setAppliedCheckoutCode(null);
        setCheckoutCodePreview(null);

        try {
            const preview = await previewCreateEventCode.mutateAsync({
                eventType: selectedEventType,
                planTierCode: selectedCode,
                coverageOptionId: selectedOption.id,
                collaborationCode: trimmedCode,
            });
            setAppliedCheckoutCode(trimmedCode);
            setCheckoutCodePreview(preview);
        } catch (err) {
            setCheckoutCodeError(toErrorMessage(err, t('collaboration.invalid')));
        }
    }, [checkoutCode, previewCreateEventCode, selectedCode, selectedEventType, selectedOption, t, toErrorMessage]);

    const handleSubmit = useCallback(
        async (e: React.SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            if (step === 'details') {
                if (canSubmitDetails) goToStep('overview');
                return;
            }
            if (step !== 'overview') return;
            if (!isEmailVerified || !consent.consentSatisfied || !selectedOption) return;

            let eventId = createdDraftEventId;

            if (!eventId) {
                if (!canSubmitDetails) return;

                const input: EventRequestDto = {
                    title: trimmedTitle,
                    planTierCode: selectedCode,
                    coverageOptionId: selectedOption.id,
                    eventType: selectedEventType,
                    visibility: 'PRIVATE',
                    startAt: new Date(startAt).toISOString(),
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
                    setCreatedDraftSelection({ planCode: selectedCode, optionId: selectedOption.id });
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

            // The draft exists already: a duration picked since then is saved to
            // it first, because checkout charges the draft's duration.
            if (createdDraftSelection?.planCode === selectedCode && createdDraftSelection.optionId !== selectedOption.id) {
                try {
                    setIsCheckoutPending(true);
                    await updateDraft.mutateAsync({ coverageOptionId: selectedOption.id });
                    setCreatedDraftSelection({ planCode: selectedCode, optionId: selectedOption.id });
                } catch (updateError) {
                    setIsCheckoutPending(false);
                    setError(toErrorMessage(updateError));
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
                // The duration was retired after it was picked: reload the plans
                // so the host can choose one that is still on sale.
                if (getErrorCode(checkoutError) === ERROR_CODES.COVERAGE_OPTION_UNAVAILABLE) void planTiersQuery.refetch();
                setError(toErrorMessage(checkoutError));
            }
        },
        [
            appliedCheckoutCode,
            canSubmitDetails,
            consent,
            createEvent,
            createdDraftEventId,
            createdDraftSelection,
            goToStep,
            initialSessionTitle,
            isEmailVerified,
            mapsUrl,
            planTiersQuery,
            selectedCode,
            selectedEventType,
            selectedOption,
            step,
            timezone,
            toErrorMessage,
            updateDraft,
            trimmedLocationAddress,
            trimmedLocationName,
            trimmedTitle,
            startAt,
        ],
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
        media,
        selectedCode,
        selectedPlan,
        selectedOption,
        durationPicks: durationPicks.picks,
        onSelectPlan,
        onSelectPlanDuration,
        isPlansLoading: planTiersQuery.isLoading,
        canContinuePlan: Boolean(selectedCode && selectedOption),

        title,
        titleError: fieldErrors?.title,
        onTitleChange,
        startAt,
        startAtMin,
        startAtMax,
        scheduleError,
        projectedCoverage,
        onStartAtChange,
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

        isSubmitPending: createEvent.isPending || updateDraft.isPending || isCheckoutPending,
        isEmailVerified,
    };
}
