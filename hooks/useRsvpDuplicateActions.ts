'use client';

import { useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useClearRsvpDuplicateMark, useDeleteRsvp } from '@/hooks/useRsvps';
import type { RosterEntry } from '@/lib/rsvpGuests';

export type RsvpToRemove = { rsvpId: string; eventMemberId: string; name: string };

// The host's answer to a reply marked as a possible duplicate: keep it (clears
// the mark) or remove it after a confirmation. Removing a reply-only guest's
// reply removes that guest too.
export function useRsvpDuplicateActions(eventId: string) {
    const keepMutation = useClearRsvpDuplicateMark(eventId);
    const removeMutation = useDeleteRsvp(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [toRemove, setToRemove] = useState<RsvpToRemove | null>(null);
    const [error, setError] = useState<string | null>(null);

    function keep(entry: RosterEntry) {
        if (!entry.rsvp) return;
        setError(null);
        keepMutation.mutate({ id: entry.rsvp.id }, { onError: (failure) => setError(toErrorMessage(failure)) });
    }

    function askToRemove(entry: RosterEntry) {
        if (!entry.rsvp) return;
        setError(null);
        setToRemove({ rsvpId: entry.rsvp.id, eventMemberId: entry.id, name: entry.name });
    }

    function cancelRemove() {
        if (!removeMutation.isPending) setToRemove(null);
    }

    async function confirmRemove() {
        if (!toRemove) return;
        try {
            await removeMutation.mutateAsync({ id: toRemove.rsvpId, eventMemberId: toRemove.eventMemberId });
        } catch (failure) {
            setError(toErrorMessage(failure));
        } finally {
            setToRemove(null);
        }
    }

    const keepingId = keepMutation.isPending ? (keepMutation.variables?.id ?? null) : null;

    return { keep, keepingId, toRemove, askToRemove, cancelRemove, confirmRemove, isRemoving: removeMutation.isPending, error };
}
