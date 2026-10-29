'use client';

import { useCallback, useState } from 'react';

import { useSendTestNotification } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

// The drawer's test notification. The drawer is remounted on every opening, so each opening starts blank.
export function usePhoneTestNotification(device: AdminDeviceDto | null) {
    const { mutateAsync: sendTest, isPending: sending } = useSendTestNotification();
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const send = useCallback(async () => {
        if (!device) return;
        setSent(false);
        setError(null);
        try {
            await sendTest(device.id);
            setSent(true);
        } catch (caught) {
            setError(caught);
        }
    }, [device, sendTest]);

    return { send, sending, sent, error };
}
