'use client';

import { type MouseEvent, useCallback, useState } from 'react';

import { useAdminDevices } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

// token: which opening this is. Each drawer is keyed on it, so every opening starts clean and a
// pairing code never survives a close.
type CreateState = { open: boolean; token: number };
type DetailState = { open: boolean; device: AdminDeviceDto | null; token: number };

const NO_DEVICES: AdminDeviceDto[] = [];

export function usePhonesPanel() {
    const query = useAdminDevices();
    const devices = query.data ?? NO_DEVICES;
    const [create, setCreate] = useState<CreateState>({ open: false, token: 0 });
    const [detail, setDetail] = useState<DetailState>({ open: false, device: null, token: 0 });

    const handleAddClick = useCallback(() => setCreate((current) => ({ open: true, token: current.token + 1 })), []);
    const closeCreate = useCallback(() => setCreate((current) => ({ ...current, open: false })), []);

    const handleOpenClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const found = devices.find((device) => device.id === event.currentTarget.dataset.deviceId);
            if (found) setDetail((current) => ({ open: true, device: found, token: current.token + 1 }));
        },
        [devices],
    );
    const closeDetail = useCallback(() => setDetail((current) => ({ ...current, open: false })), []);

    return { query, devices, create, detail, handleAddClick, closeCreate, handleOpenClick, closeDetail };
}
