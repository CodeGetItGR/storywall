'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type SubmitEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { billingKeys, useAddEventAddon, useAddonCheckout, useEventBilling, useEventQuote, useRemoveEventAddon } from '@/hooks/useBilling';
import { useDraftActivationCheckout } from '@/hooks/useDraftActivationCheckout';
import { eventModuleKeys, useEventModules } from '@/hooks/useEventModules';
import type { AddonStepFallback } from '@/hooks/usePublishInvitation';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { navigateToCheckout } from '@/lib/billing';
import { featureAddonsTotalMinor, isStaleOfferRefusal } from '@/lib/featureAddons';
import {
    addonStepCodes,
    draftAddonChanges,
    draftAddonStepTotalMinor,
    draftQuoteOtherItems,
    type InvitationAddonStep,
    invitationAddonStep,
    showsRsvpSection,
} from '@/lib/invitation/addonStep';
import type { InvitationDocument } from '@/lib/invitation/document';
import { routes } from '@/lib/routes';

/**
 * What Publish's add-on step offers on the chosen event (KAN-82). The reads are warm from
 * useInvitationAddonCheck, which opened the step.
 */
export function useInvitationAddonOffer({ eventId, document }: { eventId: string; document: InvitationDocument }) {
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId);
    const eventModules = useEventModules(eventId);

    const step = useMemo(() => {
        if (!appConfig.data || !billing.data || !eventModules.data) return null;
        return invitationAddonStep(
            {
                paidServices: appConfig.data.paidServices,
                platformModules: appConfig.data.modules,
                planTiers: appConfig.data.planTiers,
                billing: billing.data,
                eventModules: eventModules.data,
            },
            showsRsvpSection(document),
        );
    }, [appConfig.data, billing.data, document, eventModules.data]);

    return {
        isLoading: appConfig.isLoading || billing.isLoading || eventModules.isLoading,
        // A failed read: the step can't say what the event lacks.
        failed: appConfig.isError || billing.isError || eventModules.isError,
        step,
    };
}

/**
 * Leaves the step when it has nothing to offer after all, with no message of its own: a failed
 * read goes to the plan dialog, and an event that has the invitation now (switched on elsewhere,
 * or a refusal refreshed the offers) goes on publishing.
 */
export function useAddonStepFallback(
    offer: ReturnType<typeof useInvitationAddonOffer>,
    fallBack: (to: AddonStepFallback) => void,
    // Off while payment is in flight: the sheet stays until the browser leaves.
    enabled = true,
) {
    const target: AddonStepFallback | null = !enabled ? null : offer.failed ? 'plan' : !offer.isLoading && !offer.step ? 'publish' : null;
    useEffect(() => {
        if (target) fallBack(target);
    }, [fallBack, target]);
}

/**
 * The sheet's close while payment may be in flight. closeDisabled covers the close button, Esc and
 * the backdrop; Back calls close directly, so it is ignored here too, and a later error still shows.
 */
export function useAddonSheetLock(close: () => void) {
    const [isPaying, setIsPaying] = useState(false);
    const lockedClose = useCallback(() => {
        if (!isPaying) close();
    }, [close, isPaying]);
    return { isPaying, setIsPaying, close: lockedClose };
}

/**
 * Keeps the last value seen while settled. A draft's total joins billing and its quote, which
 * refetch separately after an opt-in: between the two it would be briefly wrong.
 */
function useSettledValue<T>(value: T, settled: boolean): T {
    const [kept, setKept] = useState(value);
    if (settled && kept !== value) setKept(value);
    return settled ? value : kept;
}

/**
 * The step's choices and payment. A live event pays for the add-ons on their own; a draft opts
 * into them and pays with its plan. Paying brings the host back to the editor, which publishes.
 */
export function useInvitationAddonCheckout({
    eventId,
    draftId,
    step,
    onPendingChange,
}: {
    eventId: string;
    draftId: string;
    step: InvitationAddonStep;
    // Told while payment is in flight, so the sheet can't be dismissed.
    onPendingChange?: (isPending: boolean) => void;
}) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const isDraft = step.mode === 'draft';
    const returnTo = routes.saveMyDateEditorPublish(draftId);
    // An RSVP a draft already opted into starts ticked: unticking it is the host's own choice.
    const [rsvpTicked, setRsvpTicked] = useState(step.rsvp?.added ?? false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // The payment page is opening: the sheet stays put until the browser leaves.
    const [isRedirecting, setIsRedirecting] = useState(false);

    const codes = useMemo(() => addonStepCodes(step, rsvpTicked), [rsvpTicked, step]);
    const liveConsent = useWithdrawalConsent();
    const billing = useEventBilling(eventId);
    const addonCheckout = useAddonCheckout(eventId);
    const draftCheckout = useDraftActivationCheckout(eventId, { quoteEnabled: isDraft, startAt: null, returnTo });
    const addAddon = useAddEventAddon(eventId);
    const removeAddon = useRemoveEventAddon(eventId);
    const consent = isDraft ? draftCheckout.consent : liveConsent;

    useResetOnBfcacheRestore(
        useCallback(() => {
            addonCheckout.reset();
            setIsRedirecting(false);
        }, [addonCheckout]),
    );

    // A live event's server total; the catalogue sum stands in until it answers (no discount applies).
    const liveQuote = useEventQuote(eventId, isDraft ? null : { kind: 'MODULE_UNLOCK', paidServiceCodes: codes }, !isDraft);
    const services = useMemo(
        () => [step.saveMyDate, ...(step.rsvp ? [step.rsvp] : [])].map((offer) => offer.service).filter((service) => codes.includes(service.code)),
        [codes, step],
    );
    const draftTotalMinor = useSettledValue(
        isDraft ? draftAddonStepTotalMinor(step, rsvpTicked, draftCheckout.breakdown?.totalMinor ?? null) : null,
        !billing.isFetching && !draftCheckout.isQuoteFetching,
    );
    const totalMinor = isDraft ? draftTotalMinor : (liveQuote.data?.totalMinor ?? featureAddonsTotalMinor(services));
    const currency = (isDraft ? draftCheckout.breakdown?.currency : liveQuote.data?.currency) ?? step.saveMyDate.service.priceCurrency;
    // The plan and the draft's other add-ons, listed above the step's own.
    const draftItems = useMemo(
        () => (isDraft && draftCheckout.breakdown ? draftQuoteOtherItems(draftCheckout.breakdown, step) : null),
        [draftCheckout.breakdown, isDraft, step],
    );

    const isPending = isSaving || isRedirecting || addonCheckout.isPending || draftCheckout.isPending;
    useEffect(() => onPendingChange?.(isPending), [isPending, onPendingChange]);
    // A draft pays only a priced activation: a passed start or a failed quote can't be paid.
    const draftPayable =
        totalMinor !== null && !draftCheckout.startPassed && !draftCheckout.quoteError && draftCheckout.partnerBranding.satisfied;
    const canSubmit = consent.consentSatisfied && Boolean(consent.termsVersion) && (!isDraft || draftPayable) && !isPending;

    const refreshOffers = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: billingKeys.event(eventId) });
        void queryClient.invalidateQueries({ queryKey: eventModuleKeys.list(eventId) });
    }, [eventId, queryClient]);

    const payLive = useCallback(async () => {
        try {
            const response = await addonCheckout.mutateAsync({
                paidServiceCodes: codes,
                requestsImmediateStart: liveConsent.requestsImmediateStart,
                acknowledgesWithdrawalTerms: liveConsent.acknowledgesWithdrawalTerms,
                termsVersion: liveConsent.termsVersion!,
            });
            setIsRedirecting(true);
            navigateToCheckout(eventId, response, undefined, returnTo);
        } catch (checkoutError) {
            if (liveConsent.handleCheckoutError(checkoutError)) return;
            setError(toErrorMessage(checkoutError));
            if (isStaleOfferRefusal(checkoutError)) refreshOffers();
        }
    }, [addonCheckout, codes, eventId, liveConsent, refreshOffers, returnTo, toErrorMessage]);

    // Puts back what this step changed on the draft, best effort: the draft ends as it began.
    const rollBack = useCallback(
        async ({ added, removed }: { added: string[]; removed: string[] }) => {
            const undo = [
                ...added.map((code) => () => removeAddon.mutateAsync(code)),
                ...removed.map((code) => () => addAddon.mutateAsync({ paidServiceCode: code })),
            ];
            for (const undoChange of undo) {
                try {
                    await undoChange();
                } catch {
                    // Nothing more to do: the refreshed offers show the draft as it is.
                }
            }
        },
        [addAddon, removeAddon],
    );

    // A draft opts in and out first; one already on the event counts as added. When the payment
    // can't open after all, the opt-ins go back as they were. The step stays busy until then, so a
    // second tap can't pay while the rollback is still taking an add-on back out.
    const payDraft = useCallback(async () => {
        const { add, remove } = draftAddonChanges(step, rsvpTicked);
        const applied = { added: [] as string[], removed: [] as string[] };
        let opened = false;
        setIsSaving(true);
        try {
            for (const code of add) {
                try {
                    await addAddon.mutateAsync({ paidServiceCode: code });
                    applied.added.push(code);
                } catch (addError) {
                    if (getErrorCode(addError) !== ERROR_CODES.ADDON_ALREADY_ACTIVE) throw addError;
                }
            }
            for (const code of remove) {
                await removeAddon.mutateAsync(code);
                applied.removed.push(code);
            }
            opened = await draftCheckout.submit();
        } catch (changeError) {
            setError(toErrorMessage(changeError));
        }
        if (opened) {
            setIsRedirecting(true);
        } else {
            await rollBack(applied);
            refreshOffers();
        }
        setIsSaving(false);
    }, [addAddon, draftCheckout, refreshOffers, removeAddon, rollBack, rsvpTicked, step, toErrorMessage]);

    const submit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!canSubmit) return;
            setError(null);
            void (isDraft ? payDraft() : payLive());
        },
        [canSubmit, isDraft, payDraft, payLive],
    );

    const handleRsvpChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setRsvpTicked(event.currentTarget.checked);
    }, []);

    return {
        step,
        rsvpTicked,
        handleRsvpChange,
        draftItems,
        totalMinor,
        currency,
        consent,
        canSubmit,
        isPending,
        error: error ?? (isDraft ? (draftCheckout.error ?? draftCheckout.quoteError) : null),
        submit,
    };
}

export type InvitationAddonCheckout = ReturnType<typeof useInvitationAddonCheckout>;
