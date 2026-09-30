'use client';

import { type SubmitEvent, useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useIssueGiftCard, useSaveGift } from '@/hooks/useGift';
import { useGiftDetailsInput } from '@/hooks/useGiftDetailsInput';
import type { GiftHandoverResponseDto } from '@/lib/api/types';
import { canEditGift, canIssueGiftCard, giftCardIsLive, giftDetailsFromHandover } from '@/lib/gift';

/**
 * The "Given as a gift" section's actions, all primary-host only: declare or
 * edit the gift, and issue (or reissue) its card. The PIN of a card issued here
 * is shown once, then only kept in memory for the print page.
 */
export function useGiftManagement(
    eventId: string,
    gift: GiftHandoverResponseDto | null,
    { canManage, eventActive }: { canManage: boolean; eventActive: boolean },
) {
    const toErrorMessage = useApiErrorMessage();
    const saveGift = useSaveGift(eventId);
    const issueCard = useIssueGiftCard(eventId);
    const details = useGiftDetailsInput();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [reissueOpen, setReissueOpen] = useState(false);
    const [issueError, setIssueError] = useState<string | null>(null);
    const [pinOpen, setPinOpen] = useState(false);

    const { setValue } = details;
    const openDetails = useCallback(() => {
        setValue(giftDetailsFromHandover(gift));
        setDetailsError(null);
        setDetailsOpen(true);
    }, [gift, setValue]);

    const closeDetails = useCallback(() => {
        if (!saveGift.isPending) setDetailsOpen(false);
    }, [saveGift.isPending]);

    const { mutateAsync: save } = saveGift;
    const submitDetails = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!details.request) return;
            setDetailsError(null);
            try {
                await save({ input: details.request });
                setDetailsOpen(false);
            } catch (error) {
                setDetailsError(toErrorMessage(error));
            }
        },
        [details.request, save, toErrorMessage],
    );

    const { mutateAsync: issue } = issueCard;
    const issueNow = useCallback(async () => {
        setIssueError(null);
        try {
            await issue();
            setReissueOpen(false);
            setPinOpen(true);
        } catch (error) {
            setIssueError(toErrorMessage(error));
        }
    }, [issue, toErrorMessage]);

    // A card that may already be printed only goes after a confirmation.
    const requestIssue = useCallback(() => {
        setIssueError(null);
        if (gift && giftCardIsLive(gift)) setReissueOpen(true);
        else void issueNow();
    }, [gift, issueNow]);

    const closeReissue = useCallback(() => {
        if (!issueCard.isPending) setReissueOpen(false);
    }, [issueCard.isPending]);

    const closePin = useCallback(() => setPinOpen(false), []);

    return {
        canEdit: canManage && (!gift || canEditGift(gift)),
        canIssue: canManage && Boolean(gift) && canIssueGiftCard(gift!, eventActive),
        hasLiveCard: Boolean(gift && giftCardIsLive(gift)),
        // Details
        details,
        detailsOpen,
        detailsError,
        isSaving: saveGift.isPending,
        openDetails,
        closeDetails,
        submitDetails,
        // Card
        issueError,
        isIssuing: issueCard.isPending,
        requestIssue,
        reissueOpen,
        closeReissue,
        confirmReissue: issueNow,
        issuedPin: issueCard.data?.pin ?? null,
        pinOpen,
        closePin,
    };
}

export type GiftManagement = ReturnType<typeof useGiftManagement>;
