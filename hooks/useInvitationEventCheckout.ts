'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { CheckoutResponseDto, EventAddonDto, EventResponseDto, EventTypeConvention, PaidServiceResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { checkoutAttribution } from '@/lib/campaignAttribution';
import { getInitialSessionTitleKey } from '@/lib/createEventCatalog';
import { getCurrentDatetimeLocalValue } from '@/lib/datetime';
import {
    invitationPlanAddonCodes,
    invitationPlanAddons,
    invitationPlanTotal,
    retryAddonChanges,
    showsRsvpSection,
} from '@/lib/invitation/addonStep';
import type { InvitationDocument } from '@/lib/invitation/document';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { invitationEventDetails, invitationEventRequest, plansWithInvitation } from '@/lib/invitation/invitationEvent';
import { defaultSelectedPlan, liveInitialOptions, resolveInitialOption } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { getCurrentTimezone } from '@/lib/timezones';

type InvitationEventCheckoutOptions = {
    draftId: string;
    eventType: string;
    // The invitation as it is now: the event takes its names, date and place.
    document: InvitationDocument;
    // Only while the plan step is open.
    enabled: boolean;
};

// A new event made from the invitation: the host picks a plan and its length, answers only what the
// invitation doesn't say (a name, a date still ahead), and pays. The event is created, the draft put
// on it, and checkout opens; paying brings the host back to the editor.
export function useInvitationEventCheckout({ draftId, eventType, document, enabled }: InvitationEventCheckoutOptions) {
    const t = useTranslations('CreateEventPage');
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const appConfig = useAppConfig({ enabled });
    const consent = useWithdrawalConsent();
    const durationPicks = useDurationPicks();
    const plansQuery = usePlanTiersForEventType(eventType as EventTypeConvention, enabled);
    const paidServices = appConfig.data?.paidServices;
    const platformModules = appConfig.data?.modules;
    // A plan with no length on sale can't be bought, so it isn't offered. A plan without the
    // invitation is offered when it sells it as an add-on (KAN-82).
    const allPlans = useMemo(
        () =>
            plansWithInvitation(plansQuery.data ?? [], paidServices, platformModules).filter((plan) => liveInitialOptions(plan).length > 0),
        [paidServices, plansQuery.data, platformModules],
    );

    // Once made, the event keeps its plan: a retry pays for that one.
    const [created, setCreated] = useState<{ eventId: string; planCode: string; optionId: string } | null>(null);
    const plans = useMemo(() => (created ? allPlans.filter((plan) => plan.code === created.planCode) : allPlans), [allPlans, created]);
    const [planCode, setPlanCode] = useState<string | null>(null);
    const selectedPlan = defaultSelectedPlan(plans, planCode);
    const selectedOption = selectedPlan ? resolveInitialOption(selectedPlan, durationPicks.picks[selectedPlan.code]) : null;

    // The Save my date add-on under each plan that lacks it, and RSVP on the chosen plan when the
    // invitation asks for replies.
    const showsRsvp = useMemo(() => showsRsvpSection(document), [document]);
    const planAddons = useMemo(
        () =>
            Object.fromEntries(
                plans.flatMap((plan): [string, PaidServiceResponseDto][] => {
                    const addon = invitationPlanAddons(plan, paidServices ?? [], platformModules ?? [], false).saveMyDate;
                    return addon ? [[plan.code, addon]] : [];
                }),
            ),
        [paidServices, plans, platformModules],
    );
    const selectedAddons = useMemo(
        () => invitationPlanAddons(selectedPlan, paidServices ?? [], platformModules ?? [], showsRsvp),
        [paidServices, platformModules, selectedPlan, showsRsvp],
    );
    const [rsvpTicked, setRsvpTicked] = useState(false);
    // The opt-ins already on the made event, so a retry adds and removes only what changed.
    const appliedAddons = useRef<string[]>([]);

    // Read when the step opens; the host is asked only for what is missing.
    const details = useMemo(() => invitationEventDetails(document), [document]);
    const [title, setTitle] = useState('');
    const [startAt, setStartAt] = useState('');
    const needsTitle = details.title === null;
    const needsStart = details.startAt === null;
    const eventTitle = details.title ?? title.trim();
    const eventStart = details.startAt ?? startAt;
    const startAtMin = getCurrentDatetimeLocalValue(new Date());

    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    // Blocks a second tap before the first one's pending state renders.
    const inFlight = useRef(false);
    // Back from Stripe can restore this page as it was, still paying. The made event and its
    // add-ons stay, so Continue pays for them again.
    useResetOnBfcacheRestore(
        useCallback(() => {
            inFlight.current = false;
            setIsPending(false);
        }, []),
    );

    const onTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value), []);
    const handleRsvpChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setRsvpTicked(event.currentTarget.checked), []);

    const canSubmit =
        Boolean(selectedPlan && selectedOption) &&
        eventTitle.length > 0 &&
        eventStart.length > 0 &&
        consent.consentSatisfied &&
        Boolean(consent.termsVersion) &&
        !isPending;

    const createEvent = useCallback(async (): Promise<string> => {
        if (created) {
            // Only the length can change on a made event.
            if (selectedOption && created.optionId !== selectedOption.id) {
                await api.patch<EventResponseDto>(endpoints.events.byId(created.eventId), { coverageOptionId: selectedOption.id });
                setCreated({ ...created, optionId: selectedOption.id });
            }
            return created.eventId;
        }
        const initialSessionTitleKey = getInitialSessionTitleKey(eventType as EventTypeConvention);
        const event = await api.post<EventResponseDto>(
            endpoints.events.list,
            invitationEventRequest({
                details,
                title: eventTitle,
                startAt: eventStart,
                eventType: eventType as EventTypeConvention,
                planTierCode: selectedPlan!.code,
                coverageOptionId: selectedOption!.id,
                timezone: getCurrentTimezone(),
                initialSessionTitle: t.has(initialSessionTitleKey) ? t(initialSessionTitleKey) : undefined,
            }),
        );
        setCreated({ eventId: event.id, planCode: selectedPlan!.code, optionId: selectedOption!.id });
        void queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        return event.id;
    }, [created, details, eventStart, eventTitle, eventType, queryClient, selectedOption, selectedPlan, t]);

    // The chosen add-ons join the activation payment. One already on the event counts as added.
    const applyAddons = useCallback(
        async (eventId: string) => {
            const { add, remove } = retryAddonChanges(invitationPlanAddonCodes(selectedAddons, rsvpTicked), appliedAddons.current);
            for (const code of add) {
                try {
                    await api.post<EventAddonDto>(endpoints.events.addons(eventId), { paidServiceCode: code });
                } catch (addError) {
                    if (getErrorCode(addError) !== ERROR_CODES.ADDON_ALREADY_ACTIVE) throw addError;
                }
                appliedAddons.current = [...appliedAddons.current, code];
            }
            for (const code of remove) {
                await api.del<void>(endpoints.events.addon(eventId, code));
                appliedAddons.current = appliedAddons.current.filter((applied) => applied !== code);
            }
        },
        [rsvpTicked, selectedAddons],
    );

    const submit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canSubmit || !selectedPlan || inFlight.current) return;
            inFlight.current = true;
            setError(null);
            setIsPending(true);
            try {
                const eventId = await createEvent();
                // The draft goes on the event first, so if the add-ons fail and the host reloads, the
                // editor offers them on this event instead of making another. Putting it on the same
                // event again changes nothing, so a retry is safe.
                const attached = await api.put<InvitationDraftDto>(endpoints.invitationDrafts.event(draftId), { eventId });
                queryClient.setQueryData<InvitationDraftDto>(invitationDraftKeys.detail(draftId), (old) =>
                    old ? { ...old, eventId: attached.eventId } : attached,
                );
                await applyAddons(eventId);
                const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), {
                    ...checkoutAttribution(),
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion!,
                });
                // Paying brings the host back to the editor, which goes on to publish.
                navigateToCheckout(eventId, checkout, selectedPlan.code, routes.saveMyDateEditorPublish(draftId));
            } catch (checkoutError) {
                inFlight.current = false;
                setIsPending(false);
                if (consent.handleCheckoutError(checkoutError)) return;
                setError(toErrorMessage(checkoutError));
            }
        },
        [applyAddons, canSubmit, consent, createEvent, draftId, queryClient, selectedPlan, toErrorMessage],
    );

    const selectPlan = useCallback((code: string) => setPlanCode(code), []);
    const total = useMemo(
        () => invitationPlanTotal(selectedPlan, selectedOption, selectedAddons, rsvpTicked),
        [rsvpTicked, selectedAddons, selectedOption, selectedPlan],
    );

    return {
        plans,
        modules: appConfig.data?.modules ?? [],
        media: appConfig.data?.media ?? null,
        isLoadingPlans: enabled && (plansQuery.isLoading || appConfig.isLoading),
        selectedCode: selectedPlan?.code ?? '',
        durationPicks: durationPicks.picks,
        planAddons,
        rsvpAddon: selectedAddons.rsvp,
        rsvpTicked,
        handleRsvpChange,
        total,
        selectPlan,
        selectDuration: durationPicks.pickDuration,
        needsTitle,
        title,
        onTitleChange,
        needsStart,
        startAt,
        startAtMin,
        onStartAtChange: setStartAt,
        consent,
        canSubmit,
        isPending,
        error,
        submit,
    };
}

export type InvitationEventCheckout = ReturnType<typeof useInvitationEventCheckout>;
