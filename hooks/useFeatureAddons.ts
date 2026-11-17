'use client';

import { useSearchParams } from 'next/navigation';
import { type ChangeEvent, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAddEventAddon, useAddonCheckout, useEventQuote, useRemoveEventAddon } from '@/hooks/useBilling';
import { useStoragePurchasePaused } from '@/hooks/useBillingWithdrawals';
import { useEventModules } from '@/hooks/useEventModules';
import { usePurchaseBlock } from '@/hooks/usePurchaseBlock';
import { useResetOnBfcacheRestore } from '@/hooks/useResetOnBfcacheRestore';
import { useWithdrawalConsent } from '@/hooks/useWithdrawalConsent';
import type { EventAddonDto, EventStatus, PlanTierResponseDto } from '@/lib/api/types';
import { navigateToCheckout } from '@/lib/billing';
import { featureAddonMode, featureAddonOffers, featureAddonsTotalMinor, pickedFeatureAddons } from '@/lib/featureAddons';
import { INCIDENT_MODE } from '@/lib/incident';
import { ADDONS_PRESELECT_PARAM } from '@/lib/routes';

/**
 * The Add-ons page's "Add features" section (KAN-82): which feature add-ons the event's plan
 * sells, and the way to get them. A live event ticks one or more and pays for them on their
 * own; a draft adds or removes each one, and pays for them with its plan.
 */
export function useFeatureAddons({
    eventId,
    eventStatus,
    plan,
    ownedAddons,
}: {
    eventId: string;
    eventStatus: EventStatus | null;
    plan: PlanTierResponseDto | null;
    ownedAddons: EventAddonDto[];
}) {
    const appConfig = useAppConfig();
    const eventModules = useEventModules(eventId || null);
    const purchaseBlock = usePurchaseBlock();
    const canPurchase = purchaseBlock === null && !INCIDENT_MODE;
    const mode = featureAddonMode(eventStatus);
    // A whole-event withdrawal under review pauses add-ons the same way it pauses storage packs.
    const paused = useStoragePurchasePaused(eventId, canPurchase && mode === 'checkout');
    const toErrorMessage = useApiErrorMessage();
    const consent = useWithdrawalConsent();
    const checkout = useAddonCheckout(eventId);
    const addAddon = useAddEventAddon(eventId);
    const removeAddon = useRemoveEventAddon(eventId);
    const [error, setError] = useState<string | null>(null);
    const [pendingCode, setPendingCode] = useState<string | null>(null);

    useResetOnBfcacheRestore(checkout.reset);

    const offers = useMemo(
        () =>
            featureAddonOffers({
                paidServices: appConfig.data?.paidServices ?? [],
                platformModules: appConfig.data?.modules ?? [],
                plan,
                eventModules: eventModules.data ?? [],
                ownedAddons,
                mode,
            }),
        [appConfig.data?.modules, appConfig.data?.paidServices, eventModules.data, mode, ownedAddons, plan],
    );

    // Opening the page from "Add the invitation" ticks that add-on.
    const searchParams = useSearchParams();
    const [selectedCodes, setSelectedCodes] = useState<ReadonlySet<string>>(() => {
        const preselected = searchParams.get(ADDONS_PRESELECT_PARAM);
        return new Set(preselected ? [preselected] : []);
    });

    const picked = useMemo(() => pickedFeatureAddons(offers, selectedCodes), [offers, selectedCodes]);
    const pickedCodes = useMemo(() => picked.map((service) => service.code), [picked]);
    const quoteRequest = useMemo(
        () => (mode === 'checkout' && pickedCodes.length > 0 ? { kind: 'MODULE_UNLOCK' as const, paidServiceCodes: pickedCodes } : null),
        [mode, pickedCodes],
    );
    // The server's total once it answers; the catalogue sum stands in until then (no discount applies).
    const quote = useEventQuote(eventId, quoteRequest, canPurchase && !paused);
    const totalMinor = quote.data?.totalMinor ?? featureAddonsTotalMinor(picked);
    const currency = quote.data?.currency ?? picked[0]?.priceCurrency ?? plan?.priceCurrency ?? 'EUR';

    const toggle = useCallback((code: string) => {
        setError(null);
        setSelectedCodes((current) => {
            const next = new Set(current);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    }, []);

    const pay = useCallback(async () => {
        if (!canPurchase || paused || pickedCodes.length === 0 || !consent.consentSatisfied || !consent.termsVersion) return;
        setError(null);
        try {
            navigateToCheckout(
                eventId,
                await checkout.mutateAsync({
                    paidServiceCodes: pickedCodes,
                    requestsImmediateStart: consent.requestsImmediateStart,
                    acknowledgesWithdrawalTerms: consent.acknowledgesWithdrawalTerms,
                    termsVersion: consent.termsVersion,
                }),
            );
        } catch (checkoutError) {
            if (consent.handleCheckoutError(checkoutError)) return;
            setError(toErrorMessage(checkoutError));
        }
    }, [canPurchase, checkout, consent, eventId, paused, pickedCodes, toErrorMessage]);

    // A draft's add-ons go into its activation payment; each change closes any payment page left open.
    const setDraftAddon = useCallback(
        async (code: string, added: boolean) => {
            if (!canPurchase) return;
            setError(null);
            setPendingCode(code);
            try {
                if (added) await addAddon.mutateAsync({ paidServiceCode: code });
                else await removeAddon.mutateAsync(code);
            } catch (draftError) {
                setError(toErrorMessage(draftError));
            } finally {
                setPendingCode(null);
            }
        },
        [addAddon, canPurchase, removeAddon, toErrorMessage],
    );

    // The rows carry their add-on's code (and a draft's current state) as data attributes.
    const handleToggleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const code = event.currentTarget.dataset.serviceCode;
            if (code) toggle(code);
        },
        [toggle],
    );
    const handleDraftAddonClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const code = event.currentTarget.dataset.serviceCode;
            if (code) void setDraftAddon(code, event.currentTarget.dataset.added !== 'true');
        },
        [setDraftAddon],
    );
    const handlePayClick = useCallback(() => void pay(), [pay]);

    return {
        mode,
        offers,
        // Only once the modules are known: an add-on the event already has must not flash up.
        isLoading: eventModules.isLoading,
        purchaseBlock,
        canPurchase,
        paused,
        selectedCodes,
        pickedCount: picked.length,
        totalMinor,
        currency,
        consent,
        isPaying: checkout.isPending,
        canPay: canPurchase && !paused && picked.length > 0 && consent.consentSatisfied && !checkout.isPending,
        pendingCode,
        error,
        toggle,
        pay,
        setDraftAddon,
        handleToggleChange,
        handleDraftAddonClick,
        handlePayClick,
    };
}

export type FeatureAddons = ReturnType<typeof useFeatureAddons>;
