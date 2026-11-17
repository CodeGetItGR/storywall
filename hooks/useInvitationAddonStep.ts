'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type SubmitEvent, useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { billingKeys, useAddEventAddon, useAddonCheckout, useEventBilling, useEventQuote, useRemoveEventAddon } from '@/hooks/useBilling';
import { useDraftActivationCheckout } from '@/hooks/useDraftActivationCheckout';
import { eventModuleKeys, useEventModules } from '@/hooks/useEventModules';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { navigateToCheckout } from '@/lib/billing';
import { featureAddonsTotalMinor, isStaleOfferRefusal } from '@/lib/featureAddons';
import {
    addonStepCodes,
    draftAddonChanges,
    draftAddonStepTotalMinor,
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

    return { isLoading: appConfig.isLoading || billing.isLoading || eventModules.isLoading, step };
}

/**
 * The step's choices and payment. A live event pays for the add-ons on their own; a draft opts
 * into them and pays with its plan. Paying brings the host back to the editor, which publishes.
 */
export function useInvitationAddonCheckout({ eventId, draftId, step }: { eventId: string; draftId: string; step: InvitationAddonStep }) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const isDraft = step.mode === 'draft';
    const returnTo = routes.saveMyDateEditorPublish(draftId);
    // An RSVP a draft already opted into starts ticked: unticking it is the host's own choice.
    const [rsvpTicked, setRsvpTicked] = useState(step.rsvp?.added ?? false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const codes = useMemo(() => addonStepCodes(step, rsvpTicked), [rsvpTicked, step]);
    const liveConsent = useWithdrawalConsent();
    const addonCheckout = useAddonCheckout(eventId);
    const draftCheckout = useDraftActivationCheckout(eventId, { quoteEnabled: isDraft, startAt: null, returnTo });
    const addAddon = useAddEventAddon(eventId);
    const removeAddon = useRemoveEventAddon(eventId);
    const consent = isDraft ? draftCheckout.consent : liveConsent;

    useResetOnBfcacheRestore(addonCheckout.reset);

    // A live event's server total; the catalogue sum stands in until it answers (no discount applies).
    const liveQuote = useEventQuote(eventId, isDraft ? null : { kind: 'MODULE_UNLOCK', paidServiceCodes: codes }, !isDraft);
    const services = useMemo(
        () => [step.saveMyDate, ...(step.rsvp ? [step.rsvp] : [])].map((offer) => offer.service).filter((service) => codes.includes(service.code)),
        [codes, step],
    );
    const totalMinor = isDraft
        ? draftAddonStepTotalMinor(step, rsvpTicked, draftCheckout.breakdown?.totalMinor ?? null)
        : (liveQuote.data?.totalMinor ?? featureAddonsTotalMinor(services));
    const currency = (isDraft ? draftCheckout.breakdown?.currency : liveQuote.data?.currency) ?? step.saveMyDate.service.priceCurrency;

    const isPending = isSaving || addonCheckout.isPending || draftCheckout.isPending;
    const canSubmit =
        consent.consentSatisfied && Boolean(consent.termsVersion) && (!isDraft || draftCheckout.partnerBranding.satisfied) && !isPending;

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
            navigateToCheckout(eventId, response, undefined, returnTo);
        } catch (checkoutError) {
            if (liveConsent.handleCheckoutError(checkoutError)) return;
            setError(toErrorMessage(checkoutError));
            if (isStaleOfferRefusal(checkoutError)) refreshOffers();
        }
    }, [addonCheckout, codes, eventId, liveConsent, refreshOffers, returnTo, toErrorMessage]);

    // A draft opts in and out first; one already on the event counts as added.
    const payDraft = useCallback(async () => {
        const { add, remove } = draftAddonChanges(step, rsvpTicked);
        setIsSaving(true);
        try {
            for (const code of add) {
                try {
                    await addAddon.mutateAsync({ paidServiceCode: code });
                } catch (addError) {
                    if (getErrorCode(addError) !== ERROR_CODES.ADDON_ALREADY_ACTIVE) throw addError;
                }
            }
            for (const code of remove) await removeAddon.mutateAsync(code);
        } catch (changeError) {
            setError(toErrorMessage(changeError));
            refreshOffers();
            return;
        } finally {
            setIsSaving(false);
        }
        await draftCheckout.submit();
    }, [addAddon, draftCheckout, refreshOffers, removeAddon, rsvpTicked, step, toErrorMessage]);

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
        totalMinor,
        currency,
        consent,
        canSubmit,
        isPending,
        error: error ?? (isDraft ? draftCheckout.error : null),
        submit,
    };
}

export type InvitationAddonCheckout = ReturnType<typeof useInvitationAddonCheckout>;
