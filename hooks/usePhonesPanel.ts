'use client';

import { type MouseEvent, useCallback, useState } from 'react';

import { useAdminDevices, useRefreshAdminDevices } from '@/hooks/useAdminDevices';
import type { AdminDeviceDto } from '@/lib/api/types';

// token: which opening this is. Each drawer is keyed on it, so every opening starts clean. The create
// drawer also gets a new token once its close animation ends (handleCreateClosed), which unmounts it
// and drops the pairing code it held.
type CreateState = { open: boolean; token: number };
type DetailState = { open: boolean; deviceId: string | null; token: number };

const NO_DEVICES: AdminDeviceDto[] = [];

export function usePhonesPanel() {
    const query = useAdminDevices();
    const refreshDevices = useRefreshAdminDevices();
    const devices = query.data ?? NO_DEVICES;
    const [create, setCreate] = useState<CreateState>({ open: false, token: 0 });
    const [detail, setDetail] = useState<DetailState>({ open: false, deviceId: null, token: 0 });

    const handleAddClick = useCallback(() => setCreate((current) => ({ open: true, token: current.token + 1 })), []);
    // The phone may have been scanned while the drawer was open, so the list is refreshed on close.
    const closeCreate = useCallback(() => {
        setCreate((current) => ({ ...current, open: false }));
        refreshDevices();
    }, [refreshDevices]);
    // The drawer has finished closing. A new token remounts it empty; a drawer that was opened again meanwhile is left alone.
    const handleCreateClosed = useCallback(() => setCreate((current) => (current.open ? current : { ...current, token: current.token + 1 })), []);

    const handleOpenClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        const deviceId = event.currentTarget.dataset.deviceId;
        if (deviceId) setDetail((current) => ({ open: true, deviceId, token: current.token + 1 }));
    }, []);
    const closeDetail = useCallback(() => setDetail((current) => ({ ...current, open: false })), []);

    // Read from the current list, so the drawer never shows a stale copy. A phone removed elsewhere closes it.
    const detailDevice = devices.find((device) => device.id === detail.deviceId) ?? null;

    return {
        query,
        devices,
        create,
        detail: { open: detail.open && detailDevice !== null, device: detailDevice, token: detail.token },
        handleAddClick,
        closeCreate,
        handleCreateClosed,
        handleOpenClick,
        closeDetail,
    };
}
