import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteEventHost, useTransferPrimaryEventHost } from '@/hooks/useEventHosts';
import type { EventHostResponseDto } from '@/lib/api/types';

export function useCoHostManagement(eventId: string) {
    const toErrorMessage = useApiErrorMessage();
    const transferPrimaryHost = useTransferPrimaryEventHost(eventId);
    const deleteHost = useDeleteEventHost(eventId);
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
            setError(toErrorMessage(error));
        }
    }, [toErrorMessage, transferPrimaryHost, transferTarget]);

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
