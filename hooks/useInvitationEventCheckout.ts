'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { usePlanTiersForEventType } from '@/hooks/usePlanTiersForEventType';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { CheckoutResponseDto, EventResponseDto, EventTypeConvention } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { checkoutAttribution } from '@/lib/campaignAttribution';
import { getInitialSessionTitleKey } from '@/lib/createEventCatalog';
import { getCurrentDatetimeLocalValue } from '@/lib/datetime';
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
    // A plan with no length on sale can't be bought, so it isn't offered.
    const allPlans = useMemo(
        () => plansWithInvitation(plansQuery.data ?? []).filter((plan) => liveInitialOptions(plan).length > 0),
        [plansQuery.data],
    );

    // Once made, the event keeps its plan: a retry pays for that one.
    const [created, setCreated] = useState<{ eventId: string; planCode: string; optionId: string } | null>(null);
    const plans = useMemo(() => (created ? allPlans.filter((plan) => plan.code === created.planCode) : allPlans), [allPlans, created]);
    const [planCode, setPlanCode] = useState<string | null>(null);
    const selectedPlan = defaultSelectedPlan(plans, planCode);
    const selectedOption = selectedPlan ? resolveInitialOption(selectedPlan, durationPicks.picks[selectedPlan.code]) : null;

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

    const onTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value), []);

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

    const submit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canSubmit || !selectedPlan) return;
            setError(null);
            setIsPending(true);
            try {
                const eventId = await createEvent();
                // Putting it on the same event again changes nothing, so a retry is safe.
                const attached = await api.put<InvitationDraftDto>(endpoints.invitationDrafts.event(draftId), { eventId });
                queryClient.setQueryData<InvitationDraftDto>(invitationDraftKeys.detail(draftId), (old) =>
                    old ? { ...old, eventId: attached.eventId } : attached,
                );
                const checkout = await api.post<CheckoutResponseDto>(endpoints.events.checkout(eventId), {
                    ...checkoutAttribution(),
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion!,
                });
                // Paying brings the host back to the editor, which goes on to publish.
                navigateToCheckout(eventId, checkout, selectedPlan.code, routes.saveMyDateEditorPublish(draftId));
            } catch (checkoutError) {
                setIsPending(false);
                if (consent.handleCheckoutError(checkoutError)) return;
                setError(toErrorMessage(checkoutError));
            }
        },
        [canSubmit, consent, createEvent, draftId, queryClient, selectedPlan, toErrorMessage],
    );

    const selectPlan = useCallback((code: string) => setPlanCode(code), []);

    return {
        plans,
        modules: appConfig.data?.modules ?? [],
        media: appConfig.data?.media ?? null,
        isLoadingPlans: enabled && (plansQuery.isLoading || appConfig.isLoading),
        selectedCode: selectedPlan?.code ?? '',
        durationPicks: durationPicks.picks,
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
