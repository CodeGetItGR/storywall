'use client';

import { useCallback, useState } from 'react';

import { useRevokeQrLink } from '@/hooks/useQrLinks';
import type { QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { isHostManagedQrLink } from '@/lib/qrLinks';

// Host-only management of one share link: stats sheet and revoke.
export function useQrLinkManagement({
    eventId,
    qrLink,
    stats,
    canWrite,
}: {
    eventId: string;
    qrLink: QrLinkResponseDto;
    stats?: QrLinkStatsDto;
    canWrite: boolean;
}) {
    const [statsOpen, setStatsOpen] = useState(false);
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const revokeQrLink = useRevokeQrLink(eventId);

    const isActive = qrLink.status === 'ACTIVE';
    const canRevoke = canWrite && isActive && !isHostManagedQrLink(qrLink);
    const remainingSlots = stats?.remainingSlots ?? null;
    const isLowOnSlots = remainingSlots !== null && remainingSlots <= 5;

    const openStats = useCallback(() => setStatsOpen(true), []);
    const closeStats = useCallback(() => setStatsOpen(false), []);
    const openRevokeConfirm = useCallback(() => setRevokeConfirmOpen(true), []);
    const closeRevokeConfirm = useCallback(() => setRevokeConfirmOpen(false), []);

    async function revoke() {
        if (!canRevoke) return;
        setRevokeConfirmOpen(false);
        await revokeQrLink.mutateAsync(qrLink.id);
    }

    return {
        isActive,
        canRevoke,
        remainingSlots,
        isLowOnSlots,
        statsOpen,
        openStats,
        closeStats,
        revokeConfirmOpen,
        openRevokeConfirm,
        closeRevokeConfirm,
        revoke,
        isRevoking: revokeQrLink.isPending,
    };
}
