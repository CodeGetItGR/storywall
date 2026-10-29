'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState } from 'react';

import { useRevokeQrLink, useUpdateQrLink } from '@/hooks/useQrLinks';
import type { QrLinkResponseDto, QrLinkStatsDto } from '@/lib/api/types';
import { isHostManagedQrLink } from '@/lib/qrLinks';

// Host-only management of one share link: stats sheet, guest limit and revoke.
export function useQrLinkManagement({
    eventId,
    qrLink,
    stats,
    canWrite,
    onClampNoticeAction,
}: {
    eventId: string;
    qrLink: QrLinkResponseDto;
    stats?: QrLinkStatsDto;
    canWrite: boolean;
    onClampNoticeAction?: (message: string) => void;
}) {
    const t = useTranslations('ManagePage');
    const [statsOpen, setStatsOpen] = useState(false);
    const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const defaultMaxGuests = qrLink.maxGuests ?? stats?.maxGuests ?? 50;
    const [maxGuests, setMaxGuests] = useState(defaultMaxGuests);
    const revokeQrLink = useRevokeQrLink(eventId);
    const updateQrLink = useUpdateQrLink(eventId, qrLink.id);

    const isActive = qrLink.status === 'ACTIVE';
    const canEditLimit = canWrite && qrLink.targetType === 'INVITATION' && qrLink.maxGuests !== null;
    const canRevoke = canWrite && isActive && !isHostManagedQrLink(qrLink);
    const remainingSlots = stats?.remainingSlots ?? null;
    const isLowOnSlots = remainingSlots !== null && remainingSlots <= 5;

    const openStats = useCallback(() => setStatsOpen(true), []);
    const closeStats = useCallback(() => setStatsOpen(false), []);
    const openRevokeConfirm = useCallback(() => setRevokeConfirmOpen(true), []);
    const closeRevokeConfirm = useCallback(() => setRevokeConfirmOpen(false), []);

    const startEditing = useCallback(() => {
        if (!canEditLimit) return;
        setMaxGuests(defaultMaxGuests);
        setIsEditing(true);
    }, [canEditLimit, defaultMaxGuests]);

    const stopEditing = useCallback(() => {
        setIsEditing(false);
        setMaxGuests(defaultMaxGuests);
    }, [defaultMaxGuests]);

    const raiseLimitFromStats = useCallback(() => {
        if (!canEditLimit) return;
        setStatsOpen(false);
        setIsEditing(true);
    }, [canEditLimit]);

    const changeMaxGuests = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setMaxGuests(Math.min(1000, Math.max(1, Number(event.target.value))));
    }, []);

    async function revoke() {
        if (!canRevoke) return;
        setRevokeConfirmOpen(false);
        await revokeQrLink.mutateAsync(qrLink.id);
    }

    async function saveLimit() {
        if (!canEditLimit) return;
        const requestedMaxGuests = maxGuests;
        const updated = await updateQrLink.mutateAsync({ maxGuests: requestedMaxGuests });
        if (updated.maxGuests !== requestedMaxGuests) {
            onClampNoticeAction?.(t('qr.cappedToPlan', { count: updated.maxGuests ?? requestedMaxGuests }));
        }
        setMaxGuests(updated.maxGuests ?? requestedMaxGuests);
        setIsEditing(false);
    }

    return {
        isActive,
        canEditLimit,
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
        isEditing,
        maxGuests,
        changeMaxGuests,
        startEditing,
        stopEditing,
        raiseLimitFromStats,
        saveLimit,
        isSavingLimit: updateQrLink.isPending,
        saveLimitError: updateQrLink.isError ? updateQrLink.error : null,
    };
}
