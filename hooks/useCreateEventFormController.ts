'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { usePreviewCreateEventCode } from '@/hooks/useBilling';
import { useCreateEventGift } from '@/hooks/useCreateEventGift';
import { type CreateEventFlowMode, useCreateEventStepNavigation } from '@/hooks/useCreateEventStepNavigation';
import { useCreateEventWizardDraft } from '@/hooks/useCreateEventWizardDraft';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvent';
import { useThemePresetsForType } from '@/hooks/useEventTheme';
import { useFlowEvent } from '@/hooks/useFlowEvent';
import { useMe } from '@/hooks/useMe';
import { usePartnerBrandingConsent } from '@/hooks/usePartnerBrandingConsent';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode, getFieldErrors } from '@/lib/api/errors';
import type {
    CheckoutResponseDto,
    CollaborationCodePreviewResponseDto,
    EventRequestDto,
    EventThemeRequestDto,
    EventTypeConvention,
} from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { checkoutAttribution } from '@/lib/campaignAttribution';
import { getInitialSessionTitleKey } from '@/lib/createEventCatalog';
import {
    adjacentCreateEventStep,
    CREATE_EVENT_CODE_PARAM,
    CREATE_EVENT_OPTION_PARAM,
    CREATE_EVENT_PLAN_PARAM,
    CREATE_EVENT_RUN_PARAM,
    CREATE_EVENT_STEPS,
    CREATE_EVENT_TYPE_PARAM,
    createEventDetailsRequest,
    effectiveThemePresetId,
    isThemeStepAvailable,
    rememberCreateEventCheckout,
    resolveCreateEventStep,
    resolveCreateEventType,
    stepAfter,
    stepBefore,
    visibleCreateEventSteps,
} from '@/lib/createEventSteps';
import { needsAccountStep } from '@/lib/createEventWizardAccount';
import { CREATE_EVENT_STEP_PARAM } from '@/lib/createEventWizardUrl';
import { eventWindowFromLocalStart, formatDate, getScheduleDatetimeLocalBounds, isDatetimeLocalAfter, isDatetimeLocalBefore } from '@/lib/datetime';
import { getLatestStartAt, projectCoverage } from '@/lib/eventCoverage';
import { normalizeEventTypeSlug } from '@/lib/eventTypeSlug';
import { flowErrorCode, trackFlow } from '@/lib/flowTracking';
import { defaultSelectedPlan, liveInitialOptions, planAsksEventDetails, resolveInitialOption } from '@/lib/planTiers';
import { getCurrentTimezone, getSupportedTimezones } from '@/lib/timezones';
import type { CreateEventFormValue, CreateEventStep } from '@/providers/createEvent/CreateEventFormContext';

export const CREATE_EVENT_FORM_ID = 'create-event-form';

export function useCreateEventFormController({ mode = 'legacy' }: { mode?: CreateEventFlowMode } = {}): CreateEventFormValue {
    const isWizard = mode === 'wizard';
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const searchParams = useSearchParams();
    const { isAuthenticated, isBootstrapping, user } = useAuth();
    useMe();
    // Fail closed: submission stays blocked until we positively know the
    // account is verified. `user.emailVerified` is `null` until /api/me
    // resolves, so an in-flight or failed fetch must not read as "verified".
    const isEmailVerified = user?.emailVerified === true;
    const createEvent = useCreateEvent();
    const [requestedTypeSlug] = useState(() => normalizeEventTypeSlug(searchParams.get(CREATE_EVENT_TYPE_PARAM)));
    // The wizard picks up where the host left off; a link's own type, plan, duration or code wins.
    const draft = useCreateEventWizardDraft(isWizard, requestedTypeSlug);
    const saved = draft.initial;
    // The wizard asks a guest or an unverified account to sign in before review; once shown, the step
    // stays in the count for the run (spec 3.1).
    const needsAccount = isWizard && needsAccountStep(user ? { emailVerified: user.emailVerified, role: user.role } : null);
    const [accountStepShown, setAccountStepShown] = useState(() => saved?.accountStepShown ?? false);
    // Set during render, not in an effect, so the step never renders once without being counted.
    if (needsAccount && !isBootstrapping && !accountStepShown) setAccountStepShown(true);
    const showAccountStep = isWizard && (accountStepShown || (needsAccount && !isBootstrapping));
    // A link may pick the plan and its duration (?plan=, ?option=); a code or id not on sale falls back.
    const [linkedPlanCode] = useState(() => searchParams.get(CREATE_EVENT_PLAN_PARAM) ?? saved?.planCode ?? '');
    const [linkedOptionId] = useState(() => searchParams.get(CREATE_EVENT_OPTION_PARAM));
    const durationPicks = useDurationPicks(linkedPlanCode && linkedOptionId ? { [linkedPlanCode]: linkedOptionId } : (saved?.durationPicks ?? {}));
    const previewCreateEventCode = usePreviewCreateEventCode();
    const { data: appConfig, refetch: refetchAppConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();
    const consent = useWithdrawalConsent();

    const [title, setTitle] = useState(() => saved?.title ?? '');
    // The type picked here; until then, the one the link asked for (see resolveCreateEventType).
    const [eventType, setEventType] = useState<EventTypeConvention | null>(() => (requestedTypeSlug ? null : (saved?.eventType ?? null)));
    const [startAt, setStartAt] = useState(() => saved?.startAt ?? '');
    const [timezone, setTimezone] = useState(() => saved?.timezone || getCurrentTimezone());
    const [locationName, setLocationName] = useState(() => saved?.locationName ?? '');
    const [locationAddress, setLocationAddress] = useState(() => saved?.locationAddress ?? '');
    const [mapsUrl, setMapsUrl] = useState(() => saved?.mapsUrl ?? '');
    const [error, setError] = useState<string | null>(null);
    const [selectedPlanCode, setSelectedPlanCode] = useState(linkedPlanCode);
    const [themePresetId, setThemePresetId] = useState<string | null>(() => saved?.themePresetId ?? null);
    const [createdDraftEventId, setCreatedDraftEventId] = useState<string | null>(null);
    // What the draft was created with, so a duration changed afterwards is
    // saved to it before checkout.
    const [createdDraftSelection, setCreatedDraftSelection] = useState<{
        planCode: string;
        optionId: string;
        title: string;
        startAt: string;
        themePresetId: string | null;
    } | null>(null);
    // Checkout refused the draft because its start date has passed (3035).
    const [startPassed, setStartPassed] = useState(false);
    const updateDraft = useUpdateEvent(createdDraftEventId);
    // A link may carry a discount code (?code=); the field opens with it filled (EventOverviewDiscountCode).
    const [checkoutCode, setCheckoutCode] = useState(() => searchParams.get(CREATE_EVENT_CODE_PARAM)?.trim() ?? saved?.checkoutCode ?? '');
    const [appliedCheckoutCode, setAppliedCheckoutCode] = useState<string | null>(null);
    const [checkoutCodePreview, setCheckoutCodePreview] = useState<CollaborationCodePreviewResponseDto | null>(null);
    const [checkoutCodeError, setCheckoutCodeError] = useState<string | null>(null);
    const [isCheckoutPending, setIsCheckoutPending] = useState(false);
    // A branded partner's code asks for the partner credit before checkout.
    const partnerBranding = usePartnerBrandingConsent(appliedCheckoutCode ? (checkoutCodePreview?.partnerBranding ?? null) : null);

    useResetOnBfcacheRestore(
        useCallback(() => {
            createEvent.reset();
            setIsCheckoutPending(false);
        }, [createEvent]),
    );

    const run = searchParams.get(CREATE_EVENT_RUN_PARAM);
    // Public config should already contain only enabled rows. Keep the picker
    // fail-closed if a stale or malformed response includes a disabled type.
    const eventTypes = appConfig?.eventTypes.filter((eventType) => eventType.isEnabled) ?? [];
    const step = resolveCreateEventStep(
        searchParams.get('step') ?? (isWizard ? (saved?.step ?? null) : null),
        eventTypes.map((type) => type.eventTypeKey),
        requestedTypeSlug,
    );
    const modules = appConfig?.modules ?? [];
    const media = appConfig?.media ?? null;

    const fieldErrors = getFieldErrors(createEvent.error);
    const selectedEventType = resolveCreateEventType(
        eventTypes.map((type) => type.eventTypeKey),
        eventType,
        requestedTypeSlug,
    );
    // Not before the config: the type isn't known until then, and WEDDING's plans would be fetched for nothing.
    // The wizard shows plans before sign-up; the old flow only ever runs signed in.
    const planTiersQuery = usePlanTiersForEventType(selectedEventType, (isAuthenticated || isWizard) && Boolean(appConfig), isWizard);
    // A plan with no duration on sale can't be bought, so it isn't offered.
    const eventPlans = useMemo(() => (planTiersQuery.data ?? []).filter((plan) => liveInitialOptions(plan).length > 0), [planTiersQuery.data]);
    const selectedPlan = defaultSelectedPlan(eventPlans, selectedPlanCode);
    const selectedCode = selectedPlan?.code ?? selectedPlanCode;
    const selectedOption = selectedPlan ? resolveInitialOption(selectedPlan, durationPicks.picks[selectedPlan.code]) : null;
    const gift = useCreateEventGift(selectedPlan, saved?.gift ?? null);
    const planHasTheme = selectedPlan?.moduleKeys.includes('theme') ?? false;
    const themePresetsQuery = useThemePresetsForType(planHasTheme ? selectedEventType : null, isWizard);
    const themePresets = planHasTheme ? themePresetsQuery.data : undefined;
    const themeStepAvailable = isThemeStepAvailable({ planHasTheme, isLoading: themePresetsQuery.isLoading, presets: themePresets });
    const selectedThemePresetId = effectiveThemePresetId(themePresetId, themePresets);
    const asksDetails = planAsksEventDetails(selectedPlan);
    // The old page leaves the details step out when the plan asks for no date or place, and asks for the title on
    // the overview step. The wizard keeps the step for the title.
    const detailsStepShown = asksDetails || isWizard;
    const steps = useMemo(
        () => visibleCreateEventSteps(themeStepAvailable, showAccountStep, detailsStepShown),
        [detailsStepShown, showAccountStep, themeStepAvailable],
    );
    const { reset: resetGift, saveToDraft: saveGiftToDraft } = gift;
    const initialSessionTitleKey = getInitialSessionTitleKey(selectedEventType);
    const initialSessionTitle = t.has(initialSessionTitleKey) ? t(initialSessionTitleKey) : undefined;
    const timezoneOptions = useMemo(() => getSupportedTimezones(), []);
    const isTimezoneValid = timezoneOptions.includes(timezone);
    // The server fills endAt (startAt + 24h) when it is omitted; the form only asks for a start.
    // No event exists yet, so there is no server projection to read; estimate
    // from the picked duration instead. Coverage runs from payment, not from the start.
    const coverageIfPaidNow = useMemo(() => projectCoverage({ hostingMonths: selectedOption?.months }), [selectedOption?.months]);
    const latestStartAt = getLatestStartAt(coverageIfPaidNow?.coverageEndsAt, appConfig?.coverage.minDaysAfterStart);
    const { startAtMin, startAtMax } = getScheduleDatetimeLocalBounds({ startAt, latestStartAt });
    const scheduleIssue =
        startAt && isDatetimeLocalBefore(startAt, startAtMin)
            ? 'start_past'
            : startAt && latestStartAt && isDatetimeLocalAfter(startAt, startAtMax)
              ? 'start_too_far'
              : null;
    const scheduleError =
        scheduleIssue === 'start_past'
            ? t('validation.startInPast')
            : scheduleIssue === 'start_too_far' && latestStartAt
              ? t('validation.startTooFarAhead', { date: formatDate(locale, latestStartAt, { dateStyle: 'medium' }) })
              : null;
    useFlowEvent(appConfig ? { name: 'Create Step', step, type: selectedEventType } : null);
    useFlowEvent(asksDetails && scheduleIssue ? { name: 'Create Blocked', reason: scheduleIssue } : null);
    const projectedCoverage = asksDetails && scheduleError ? null : coverageIfPaidNow;
    const timezoneError = timezone && !isTimezoneValid ? t('validation.invalidTimezone') : null;
    const trimmedTitle = title.trim();
    const trimmedLocationName = locationName.trim();
    const trimmedLocationAddress = locationAddress.trim();

    const canReachPlan = eventTypes.length > 0;
    const canReachDetails = canReachPlan && Boolean(selectedCode && selectedOption);
    // What was typed for another plan stays in the form, and counts only on a plan that asks for it.
    const hasRequiredDetails = !asksDetails || Boolean(startAt && isTimezoneValid && !scheduleError && trimmedLocationName && trimmedLocationAddress);
    const canSubmitDetails = Boolean(trimmedTitle && hasRequiredDetails && gift.isValid);
    // Without a details step, the title is asked on the overview step itself.
    const canReachOverview = canReachDetails && (!detailsStepShown || canSubmitDetails);
    // While the account still needs signing in, review isn't reachable yet: the account step is.
    const reachableStep: CreateEventStep = canReachOverview
        ? needsAccount
            ? 'account'
            : 'overview'
        : canReachDetails
          ? 'details'
          : canReachPlan
            ? 'plan'
            : 'type';

    const navigation = useCreateEventStepNavigation(mode, run);
    const goToStep = useCallback((nextStep: CreateEventStep) => navigation.push(nextStep), [navigation]);

    const goToType = useCallback(() => goToStep('type'), [goToStep]);
    const goToPlan = useCallback(() => goToStep('plan'), [goToStep]);
    const goToDetails = useCallback(() => goToStep('details'), [goToStep]);
    const goToTheme = useCallback(() => goToStep('theme'), [goToStep]);
    const goToOverview = useCallback(() => goToStep('overview'), [goToStep]);
    // The step after this one among the steps shown (details → theme → account → review).
    const goToNextStep = useCallback(() => {
        const next = stepAfter(step, steps);
        if (next) goToStep(next);
    }, [goToStep, step, steps]);
    // The old page's footer Back: the step before this one among the steps shown.
    const goToPreviousStep = useCallback(() => goToStep(adjacentCreateEventStep(steps, step, -1)), [goToStep, step, steps]);
    // The top-left Back: the step before this one among the steps shown, over a finished account step.
    const goBack = useCallback(() => {
        const previous = stepBefore(step, steps, !needsAccount);
        if (previous) navigation.back(previous);
    }, [navigation, needsAccount, step, steps]);

    useEffect(() => {
        if (step === 'type') {
            void refetchAppConfig();
        }
    }, [refetchAppConfig, step]);

    useEffect(() => {
        // Until the config and the type's plans load, no step past the type (or plan) one looks
        // reachable: a link straight to a later step (a landing plan card opens on details) must not
        // be sent back meanwhile. Nor while the session loads: who needs the account step isn't known yet.
        if (!appConfig || planTiersQuery.isLoading || isBootstrapping) return;
        if (CREATE_EVENT_STEPS.indexOf(step) > CREATE_EVENT_STEPS.indexOf(reachableStep)) {
            navigation.replace(reachableStep);
        } else if (step === 'details' && !detailsStepShown) {
            // Nothing to fill in for this plan: on to the next step shown.
            navigation.replace(themeStepAvailable ? 'theme' : showAccountStep ? 'account' : 'overview');
        } else if (step === 'theme' && !themeStepAvailable) {
            // Nothing to pick for this plan or type, or the list failed: skip ahead.
            navigation.replace(showAccountStep ? 'account' : 'overview');
        } else if (step === 'account' && !showAccountStep) {
            // The old flow, or an account that never needed it (a legacy or shared link).
            navigation.replace('overview');
        }
    }, [appConfig, detailsStepShown, isBootstrapping, navigation, planTiersQuery.isLoading, reachableStep, showAccountStep, step, themeStepAvailable]);

    // The pop-up opens on a URL with no step (it resumes the saved one). Write the step into that entry,
    // so going Back to it later shows that step instead of resuming wherever the host got to.
    const hasStepParam = searchParams.has(CREATE_EVENT_STEP_PARAM);
    useEffect(() => {
        if (isWizard && run && !hasStepParam) navigation.replace(step);
    }, [hasStepParam, isWizard, navigation, run, step]);

    const onSelectEventType = useCallback(
        (type: EventTypeConvention) => {
            if (type === selectedEventType) return;
            setEventType(type);
            setSelectedPlanCode('');
            setThemePresetId(null);
            setTitle('');
            setStartAt('');
            setTimezone(getCurrentTimezone());
            setLocationName('');
            setLocationAddress('');
            setMapsUrl('');
            setError(null);
            setCreatedDraftEventId(null);
            setCreatedDraftSelection(null);
            resetGift();
            durationPicks.resetPicks();
            setCheckoutCode('');
            setIsCheckoutPending(false);
        },
        [durationPicks, resetGift, selectedEventType],
    );

    const onTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const onStartAtChange = useCallback((value: string) => setStartAt(value), []);
    const onTimezoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTimezone(e.target.value), []);
    const onLocationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationName(e.target.value), []);
    const onLocationAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLocationAddress(e.target.value), []);
    const onMapsUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMapsUrl(e.target.value), []);
    const onSelectThemePreset = useCallback((presetId: string | null) => {
        setThemePresetId(presetId);
        setError(null);
    }, []);

    const { save: saveDraft, clear: clearDraft } = draft;
    useEffect(() => {
        if (!isWizard) return;
        saveDraft({
            run,
            step,
            eventType: eventType ?? (requestedTypeSlug ? selectedEventType : null),
            planCode: selectedPlanCode,
            durationPicks: durationPicks.picks,
            title,
            startAt,
            timezone,
            locationName,
            locationAddress,
            mapsUrl,
            themePresetId,
            gift: { isGift: gift.isGift, details: gift.details.value },
            checkoutCode,
            accountStepShown,
        });
    }, [
        accountStepShown,
        checkoutCode,
        durationPicks.picks,
        eventType,
        gift.details.value,
        gift.isGift,
        isWizard,
        locationAddress,
        locationName,
        mapsUrl,
        requestedTypeSlug,
        run,
        saveDraft,
        selectedEventType,
        selectedPlanCode,
        startAt,
        step,
        themePresetId,
        timezone,
        title,
    ]);

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

    // Closing the field drops the code with it, so no unseen discount stays applied.
    const clearCheckoutCode = useCallback(() => {
        setCheckoutCode('');
        clearCheckoutCodePreview();
        previewCreateEventCode.reset();
    }, [clearCheckoutCodePreview, previewCreateEventCode]);

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
            setStartPassed(false);
            if (step === 'details') {
                if (canSubmitDetails) goToNextStep();
                return;
            }
            if (step !== 'overview') return;
            if (!isEmailVerified || !consent.consentSatisfied || !partnerBranding.satisfied || !selectedOption || !canSubmitDetails) return;

            // A host can't move a draft to another plan, so a plan picked since the draft was created gets its own
            // draft (as a changed event type does). The old one stays among the host's events, unpaid.
            const existingDraft = createdDraftSelection?.planCode === selectedCode ? createdDraftSelection : null;
            let eventId = existingDraft ? createdDraftEventId : null;
            // A plan that doesn't ask for a date has none, whatever was typed before switching to it.
            const draftStartAt = asksDetails ? startAt : '';

            if (!eventId) {
                const input: EventRequestDto = {
                    title: trimmedTitle,
                    planTierCode: selectedCode,
                    coverageOptionId: selectedOption.id,
                    eventType: selectedEventType,
                    visibility: 'PRIVATE',
                    ...createEventDetailsRequest(asksDetails, {
                        startAt,
                        timezone,
                        locationName: trimmedLocationName,
                        locationAddress: trimmedLocationAddress,
                        mapsUrl,
                        initialSessionTitle,
                    }),
                    brandingSettings: {},
                    themePresetId: selectedThemePresetId ?? undefined,
                };

                try {
                    setIsCheckoutPending(true);
                    const event = await createEvent.mutateAsync(input);
                    eventId = event.id;
                    setCreatedDraftEventId(event.id);
                    setCreatedDraftSelection({
                        planCode: selectedCode,
                        optionId: selectedOption.id,
                        title: trimmedTitle,
                        startAt: draftStartAt,
                        themePresetId: selectedThemePresetId,
                    });
                } catch (err) {
                    setIsCheckoutPending(false);
                    trackFlow({ name: 'Checkout Error', from: 'wizard', code: flowErrorCode(err) });
                    const errors = getFieldErrors(err) ?? {};
                    if (asksDetails && Object.keys(errors).length > 0) {
                        goToStep('details');
                        return;
                    }
                    // The title's field shows its own error on the overview step.
                    if (errors.title) return;
                    // The picked theme was archived or withdrawn since the list loaded: back to the step with a fresh list.
                    if (getErrorCode(err) === ERROR_CODES.THEME_PRESET_NOT_SELECTABLE) {
                        setThemePresetId(null);
                        void themePresetsQuery.refetch();
                        setError(toErrorMessage(err));
                        goToStep('theme');
                        return;
                    }
                    setError(toErrorMessage(err));
                    return;
                }
            }

            // The draft exists already: a title, duration or start picked since then is saved
            // to it first, because checkout charges the draft's duration and dates.
            const durationChanged = Boolean(existingDraft && existingDraft.optionId !== selectedOption.id);
            const startChanged = Boolean(draftStartAt && existingDraft && existingDraft.startAt !== draftStartAt);
            const titleChanged = Boolean(existingDraft && existingDraft.title !== trimmedTitle);
            if (existingDraft && (durationChanged || startChanged || titleChanged)) {
                const dates = startChanged ? eventWindowFromLocalStart(startAt) : null;
                try {
                    setIsCheckoutPending(true);
                    await updateDraft.mutateAsync({
                        ...(titleChanged ? { title: trimmedTitle } : {}),
                        ...(durationChanged ? { coverageOptionId: selectedOption.id } : {}),
                        ...(dates ?? {}),
                    });
                    setCreatedDraftSelection({
                        ...existingDraft,
                        title: trimmedTitle,
                        optionId: durationChanged ? selectedOption.id : existingDraft.optionId,
                        startAt: draftStartAt || existingDraft.startAt,
                    });
                } catch (updateError) {
                    setIsCheckoutPending(false);
                    setError(toErrorMessage(updateError));
                    return;
                }
            }

            // A theme picked or cleared after the draft was created is saved to it too.
            if (existingDraft && existingDraft.themePresetId !== selectedThemePresetId) {
                try {
                    setIsCheckoutPending(true);
                    const body: EventThemeRequestDto = { presetId: selectedThemePresetId };
                    await api.put(endpoints.events.theme(eventId), body);
                    setCreatedDraftSelection({ ...existingDraft, themePresetId: selectedThemePresetId });
                } catch (themeError) {
                    setIsCheckoutPending(false);
                    setError(toErrorMessage(themeError));
                    return;
                }
            }

            // A gift is declared on the draft before paying for it.
            try {
                setIsCheckoutPending(true);
                await saveGiftToDraft(eventId);
            } catch (giftError) {
                setIsCheckoutPending(false);
                setError(toErrorMessage(giftError));
                return;
            }

            setIsCheckoutPending(true);
            try {
                const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), {
                    ...(appliedCheckoutCode ? { collaborationCode: appliedCheckoutCode } : {}),
                    ...partnerBranding.requestFields,
                    ...checkoutAttribution(),
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion!,
                });
                // Back from checkout then opens the draft instead of an emptied wizard.
                if (run) rememberCreateEventCheckout(run, eventId);
                // The run is done: the next wizard starts fresh, and Back from checkout opens the draft.
                if (isWizard) clearDraft();
                trackFlow({ name: 'Checkout Open', from: 'wizard', plan: selectedCode });
                navigateToCheckout(eventId, checkout);
            } catch (checkoutError) {
                setIsCheckoutPending(false);
                trackFlow({ name: 'Checkout Error', from: 'wizard', code: flowErrorCode(checkoutError) });
                if (consent.handleCheckoutError(checkoutError)) return;
                // The duration was retired after it was picked: reload the plans
                // so the host can choose one that is still on sale.
                if (getErrorCode(checkoutError) === ERROR_CODES.COVERAGE_OPTION_UNAVAILABLE) void planTiersQuery.refetch();
                setStartPassed(getErrorCode(checkoutError) === ERROR_CODES.EVENT_START_PASSED);
                setError(toErrorMessage(checkoutError));
            }
        },
        [
            appliedCheckoutCode,
            asksDetails,
            canSubmitDetails,
            clearDraft,
            consent,
            createEvent,
            createdDraftEventId,
            createdDraftSelection,
            goToNextStep,
            goToStep,
            initialSessionTitle,
            isEmailVerified,
            isWizard,
            mapsUrl,
            partnerBranding,
            planTiersQuery,
            run,
            saveGiftToDraft,
            selectedCode,
            selectedThemePresetId,
            themePresetsQuery,
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
        goToTheme,
        goToOverview,
        goBack,
        goToNextStep,
        goToPreviousStep,
        steps,
        asksDetails,
        stepAfterPlan: adjacentCreateEventStep(steps, 'plan', 1),

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
        startPassed,
        hasDraft: Boolean(createdDraftEventId),
        checkoutCode,
        appliedCheckoutCode,
        checkoutCodePreview,
        checkoutCodeError,
        isCheckingCheckoutCode: previewCreateEventCode.isPending,
        onCheckoutCodeChange,
        applyCheckoutCode,
        clearCheckoutCode,

        requestsImmediateStart: consent.requestsImmediateStart,
        acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
        staleTerms: consent.staleTerms,
        consentSatisfied: consent.consentSatisfied && partnerBranding.satisfied,
        onRequestsImmediateStartChange: consent.handleRequestsImmediateStartChange,
        onAcknowledgesWithdrawalTermsChange: consent.handleAcknowledgesWithdrawalTermsChange,
        partnerBrandingNotice: partnerBranding.notice,
        partnerBrandingAccepted: partnerBranding.accepted,
        onPartnerBrandingChange: partnerBranding.handleChange,

        themeStepAvailable,
        themePresets: themePresets ?? [],
        isThemePresetsLoading: planHasTheme && themePresetsQuery.isLoading,
        themePresetsError: themePresetsQuery.error,
        selectedThemePresetId,
        onSelectThemePreset,

        gift,

        isSubmitPending: createEvent.isPending || updateDraft.isPending || gift.isSaving || isCheckoutPending,
        isEmailVerified,
    };
}
