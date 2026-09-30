import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteEventHost, useTransferPrimaryEventHost } from '@/hooks/useEventHosts';
import { useEventGift } from '@/hooks/useGift';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { EventHostResponseDto } from '@/lib/api/types';
import { isGiftHandoverPending } from '@/lib/gift';

export function useCoHostManagement(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const tErrors = useTranslations('ApiErrors');
    const transferPrimaryHost = useTransferPrimaryEventHost(eventId);
    const deleteHost = useDeleteEventHost(eventId);
    const gift = useEventGift(eventId);
    const [transferTarget, setTransferTarget] = useState<EventHostResponseDto | null>(null);
    const [removeTarget, setRemoveTarget] = useState<EventHostResponseDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const requestTransfer = useCallback((host: EventHostResponseDto) => {
        setError(null);
        setTransferTarget(host);
    }, []);

    const requestRemove = useCallback((host: EventHostResponseDto) => {
        setError(null);
        setRemoveTarget(host);
    }, []);

    const closeTransfer = useCallback(() => {
        if (!transferPrimaryHost.isPending) setTransferTarget(null);
    }, [transferPrimaryHost.isPending]);

    const closeRemove = useCallback(() => {
        if (!deleteHost.isPending) setRemoveTarget(null);
    }, [deleteHost.isPending]);

    const confirmTransfer = useCallback(async () => {
        if (!transferTarget || transferPrimaryHost.isPending) return;

        setError(null);
        try {
            await transferPrimaryHost.mutateAsync(transferTarget.id);
            setTransferTarget(null);
        } catch (error) {
            // The transfer closes open checkouts first; one may be being paid right now.
            if (getErrorCode(error) === ERROR_CODES.CHECKOUT_SESSION_UNRESOLVED) setError(tErrors('hostTransferPaymentInProgress'));
            else setError(toErrorMessage(error));
        }
    }, [tErrors, toErrorMessage, transferPrimaryHost, transferTarget]);

    const confirmRemove = useCallback(async () => {
        if (!removeTarget || deleteHost.isPending) return;

        setError(null);
        try {
            await deleteHost.mutateAsync(removeTarget.id);
            setRemoveTarget(null);
        } catch (error) {
            setError(toErrorMessage(error));
        }
    }, [deleteHost, removeTarget, toErrorMessage]);

    return {
        // A claimed gift hands the event over by itself (5093 on a manual transfer).
        canTransfer: !isGiftHandoverPending(gift.data),
        closeRemove,
        closeTransfer,
        confirmRemove,
        confirmTransfer,
        error,
        isRemoving: deleteHost.isPending,
        isTransferring: transferPrimaryHost.isPending,
        removeTarget,
        requestRemove,
        requestTransfer,
        transferTarget,
    };
}
