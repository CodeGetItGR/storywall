'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useClaimGift, useGiftClaimPreview } from '@/hooks/useGift';
import { useMe } from '@/hooks/useMe';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { GiftClaimResponseDto } from '@/lib/api/types';
import { GIFT_PIN_LENGTH, giftClaimRefusal, isGiftClaimable, isGiftPinFormat } from '@/lib/gift';
import { routes } from '@/lib/routes';

// Why the card can't be claimed at all, or null while it can.
export type GiftClaimBlock = 'invalid' | 'locked' | 'claimed' | 'void';

/**
 * The public /gift/{token} page: the card's preview, then sign-in, then the
 * claim. A visitor whose account has the recipient's email claims without the
 * PIN; anyone else is asked for it (5 tries per card, each supplied PIN uses one).
 */
export function useGiftClaim(token: string) {
    const t = useTranslations('GiftMode.claim');
    const tErrors = useTranslations('ApiErrors');
    const toErrorMessage = useApiErrorMessage();
    const { isAuthenticated, isBootstrapping, user } = useAuth();
    useMe();
    const preview = useGiftClaimPreview(token);
    const claim = useClaimGift(token);
    const [pin, setPin] = useState('');
    // The PIN field shows up front when no email is bound, or once the server asks for it.
    const [pinAsked, setPinAsked] = useState(false);
    const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refusedAs, setRefusedAs] = useState<GiftClaimBlock | null>(null);
    const [outcome, setOutcome] = useState<GiftClaimResponseDto | null>(null);

    const previewState = preview.data?.state;
    const block: GiftClaimBlock | null =
        refusedAs ??
        (preview.error instanceof ApiError && preview.error.status === 404
            ? 'invalid'
            : previewState === 'LOCKED'
              ? 'locked'
              : previewState === 'ALREADY_CLAIMED'
                ? 'claimed'
                : previewState === 'VOID'
                  ? 'void'
                  : previewState && !isGiftClaimable(previewState)
                    ? 'invalid'
                    : null);

    const showPin = pinAsked || preview.data?.emailBound === false;
    // Guests and unconfirmed accounts are refused (4009), so they are told first.
    const accountIssue = !isAuthenticated ? null : user?.isGuestAccount ? 'guest' : user?.emailVerified === false ? 'unverified' : null;
    const returnPath = routes.giftClaim(token);

    const handlePinChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setPin(event.target.value.replace(/\D/g, '').slice(0, GIFT_PIN_LENGTH));
    }, []);

    const { mutateAsync } = claim;
    const submit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const sentPin = showPin ? pin : '';
            if (showPin && !isGiftPinFormat(sentPin)) return;
            setError(null);
            try {
                setOutcome(await mutateAsync(sentPin ? { pin: sentPin } : {}));
            } catch (claimError) {
                const refusal = giftClaimRefusal(claimError);
                if (refusal.kind === 'pin') {
                    setPinAsked(true);
                    setAttemptsLeft(refusal.attemptsLeft);
                    setPin('');
                    setError(sentPin ? t('wrongPin') : t('pinNeeded'));
                } else if (refusal.kind === 'locked') setRefusedAs('locked');
                else if (refusal.kind === 'claimed') setRefusedAs('claimed');
                else if (refusal.kind === 'notFound') setRefusedAs('invalid');
                // The handover closes open checkouts; one may be being paid right now.
                else if (getErrorCode(claimError) === ERROR_CODES.CHECKOUT_SESSION_UNRESOLVED) setError(tErrors('hostTransferPaymentInProgress'));
                else setError(toErrorMessage(claimError));
            }
        },
        [mutateAsync, pin, showPin, t, tErrors, toErrorMessage],
    );

    return {
        isLoading: preview.isLoading || isBootstrapping,
        preview: preview.data ?? null,
        block,
        outcome,
        isAuthenticated,
        accountIssue,
        loginHref: routes.auth.login({ next: returnPath }),
        registerHref: routes.auth.register({ next: returnPath }),
        showPin,
        pin,
        attemptsLeft,
        handlePinChange,
        canSubmit: !claim.isPending && (!showPin || isGiftPinFormat(pin)),
        isClaiming: claim.isPending,
        error,
        submit,
    };
}

export type GiftClaim = ReturnType<typeof useGiftClaim>;
