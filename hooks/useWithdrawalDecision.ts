'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useReleaseWithdrawal } from '@/hooks/useAdmin';
import { getKeepEventDayAvailability } from '@/lib/adminWithdrawals';
import type { WithdrawalAdminDto, WithdrawalReleaseDto } from '@/lib/api/types';

export type WithdrawalRefundMode = 'AS_CALCULATED' | 'KEEP_EVENT_DAY';

export function useWithdrawalDecision(row: WithdrawalAdminDto) {
    const release = useReleaseWithdrawal();
    const [mode, setMode] = useState<WithdrawalRefundMode>('AS_CALCULATED');
    const [note, setNote] = useState('');
    const [confirming, setConfirming] = useState(false);

    const keepEventDayAvailability = getKeepEventDayAvailability(row);
    const keepEventDay = keepEventDayAvailability === 'available' && mode === 'KEEP_EVENT_DAY';
    const trimmedNote = note.trim();
    // Keeping the event day makes the refund smaller, so the host is owed a reason.
    const noteRequired = keepEventDay;
    const releaseBlocked = noteRequired && !trimmedNote;

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value), []);
    const askRelease = useCallback(() => setConfirming(true), []);
    const cancelRelease = useCallback(() => setConfirming(false), []);

    const confirmRelease = useCallback(async () => {
        const body: WithdrawalReleaseDto | undefined = keepEventDay || trimmedNote ? { keepEventDay, note: trimmedNote || undefined } : undefined;
        try {
            await release.mutateAsync({ requestId: row.request.id, body });
        } catch {
            // Shown inline from release.error once the modal closes.
        } finally {
            setConfirming(false);
        }
    }, [keepEventDay, release, row.request.id, trimmedNote]);

    return {
        mode,
        setMode,
        note,
        handleNoteChange,
        keepEventDayAvailability,
        keepEventDay,
        noteRequired,
        releaseBlocked,
        confirming,
        askRelease,
        cancelRelease,
        confirmRelease,
        isPending: release.isPending,
        error: release.error,
    };
}
