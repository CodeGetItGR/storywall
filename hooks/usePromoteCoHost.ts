import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { usePromoteToCoHost } from '@/hooks/useEventHosts';
import type { EventMemberResponseDto } from '@/lib/api/types';

export type PromoteCoHostTarget = { userId: string; displayName: string };

// Confirm-then-promote flow for making a member a co-host, shared by the member list and the
// co-host invite form (when the invited address already belongs to a member).
export function usePromoteCoHost(eventId: string, onPromotedAction?: () => void) {
    const toErrorMessage = useApiErrorMessage();
    const promote = usePromoteToCoHost(eventId);
    const [target, setTarget] = useState<PromoteCoHostTarget | null>(null);
    const [error, setError] = useState<string | null>(null);

    const request = useCallback((next: PromoteCoHostTarget) => {
        setError(null);
        setTarget(next);
    }, []);

    const requestForMember = useCallback(
        (member: EventMemberResponseDto) => {
            if (member.userId) request({ userId: member.userId, displayName: member.displayName });
        },
        [request],
    );

    const close = useCallback(() => {
        if (!promote.isPending) setTarget(null);
    }, [promote.isPending]);

    const confirm = useCallback(async () => {
        if (!target || promote.isPending) return;

        setError(null);
        try {
            await promote.mutateAsync({ userId: target.userId });
            setTarget(null);
            onPromotedAction?.();
        } catch (caught) {
            setError(toErrorMessage(caught));
        }
    }, [onPromotedAction, promote, target, toErrorMessage]);

    return { close, confirm, error, isPromoting: promote.isPending, request, requestForMember, target };
}
