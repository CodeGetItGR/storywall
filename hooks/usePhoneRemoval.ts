'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRevokeAdminDevice } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

export function usePhoneRemoval(device: AdminDeviceDto | null, onDone: () => void) {
    const { mutateAsync: revokeDevice, isPending: removing } = useRevokeAdminDevice();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<unknown>(null);
    // The drawer is remounted on every opening. A removal that finishes after that must not close the new one.
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const openConfirmation = useCallback(() => setConfirmOpen(true), []);
    const closeConfirmation = useCallback(() => setConfirmOpen(false), []);

    const confirmRemoval = useCallback(async () => {
        if (!device) return;
        setError(null);
        try {
            await revokeDevice(device.id);
            if (!mounted.current) return;
            setConfirmOpen(false);
            onDone();
        } catch (caught) {
            if (!mounted.current) return;
            setConfirmOpen(false);
            setError(caught);
        }
    }, [device, onDone, revokeDevice]);

    return { confirmOpen, openConfirmation, closeConfirmation, confirmRemoval, removing, error };
}
