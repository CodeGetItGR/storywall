'use client';

import { useCallback, useState } from 'react';

import { useRevokeAdminDevice } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

export function usePhoneRemoval(device: AdminDeviceDto | null, onDone: () => void) {
    const revoke = useRevokeAdminDevice();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const openConfirmation = useCallback(() => setConfirmOpen(true), []);
    const closeConfirmation = useCallback(() => setConfirmOpen(false), []);

    const confirmRemoval = useCallback(async () => {
        if (!device) return;
        setError(null);
        try {
            await revoke.mutateAsync(device.id);
            setConfirmOpen(false);
            onDone();
        } catch (caught) {
            setConfirmOpen(false);
            setError(caught);
        }
    }, [device, onDone, revoke]);

    return { confirmOpen, openConfirmation, closeConfirmation, confirmRemoval, removing: revoke.isPending, error };
}
