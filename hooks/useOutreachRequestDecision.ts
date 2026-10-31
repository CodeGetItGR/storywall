'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type OutreachDecision, useDecideOutreachRequest } from '@/hooks/useAdminOutreachRequests';
import type { OutreachRequestDto } from '@/lib/api/types';

type Pending = { request: OutreachRequestDto; decision: OutreachDecision };

// Approve and Decline each ask in a dialog first, with an optional note back to the requester.
export function useOutreachRequestDecision() {
    const { mutateAsync: decide, isPending: isDeciding } = useDecideOutreachRequest();
    const [pending, setPending] = useState<Pending | null>(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState<unknown>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const open = useCallback((request: OutreachRequestDto, decision: OutreachDecision) => {
        setError(null);
        setNote('');
        setPending({ request, decision });
    }, []);

    const close = useCallback(() => setPending(null), []);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.currentTarget.value), []);

    const confirm = useCallback(async () => {
        if (!pending) return;
        setError(null);
        try {
            await decide({ id: pending.request.id, decision: pending.decision, note });
            if (!mounted.current) return;
            setPending(null);
        } catch (caught) {
            if (!mounted.current) return;
            setPending(null);
            setError(caught);
        }
    }, [decide, note, pending]);

    return { pending, note, error, isDeciding, open, close, confirm, handleNoteChange };
}

export type OutreachRequestDecisionState = ReturnType<typeof useOutreachRequestDecision>;
