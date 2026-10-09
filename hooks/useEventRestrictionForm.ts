'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { useCloseEvent, useSuspendEvent } from '@/hooks/useAdminEvents';
import { type CloseKind, closeRequest, EMPTY_RESTRICTION_DRAFT, NOTE_MAX_LENGTH, type RestrictionDraft, suspendRequest } from '@/lib/adminEvents';
import type { GuidelinesRule, OperationalCloseReason, StatementGround } from '@/lib/api/types';
import { STATEMENT_EXPLANATION_MAX, trimLikeBackend } from '@/lib/guidelinesRules';

export type RestrictionMode = 'suspend' | 'close';

// The statement for a suspension or a close. A suspension always names a rule; a close names a
// rule or an operational reason, never both, as the server requires.
export function useEventRestrictionForm(eventId: string, mode: RestrictionMode, onDoneAction: () => void) {
    const [draft, setDraft] = useState<RestrictionDraft>(EMPTY_RESTRICTION_DRAFT);
    const [closeKind, setCloseKind] = useState<CloseKind>('POLICY');
    const suspend = useSuspendEvent(eventId);
    const close = useCloseEvent(eventId);
    const mutation = mode === 'suspend' ? suspend : close;
    const kind: CloseKind = mode === 'suspend' ? 'POLICY' : closeKind;
    const suspendBody = mode === 'suspend' ? suspendRequest(draft) : null;
    const closeBody = mode === 'close' ? closeRequest(closeKind, draft) : null;

    const handleGroundChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const ground = event.currentTarget.value as StatementGround;
        setDraft((current) => ({ ...current, ground }));
    }, []);

    const handleRuleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.currentTarget;
        setDraft((current) => ({ ...current, rule: value ? (value as GuidelinesRule) : null }));
    }, []);

    const handleOperationalReasonChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.currentTarget;
        setDraft((current) => ({ ...current, operationalReason: value ? (value as OperationalCloseReason) : null }));
    }, []);

    const handleExplanationChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        const explanation = event.currentTarget.value.slice(0, STATEMENT_EXPLANATION_MAX);
        setDraft((current) => ({ ...current, explanation }));
    }, []);

    const handleNoteChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        const note = event.currentTarget.value.slice(0, NOTE_MAX_LENGTH);
        setDraft((current) => ({ ...current, note }));
    }, []);

    const confirm = useCallback(async () => {
        try {
            if (suspendBody) await suspend.mutateAsync(suspendBody);
            else if (closeBody) await close.mutateAsync(closeBody);
            else return;
            onDoneAction();
        } catch {
            // Shown from the mutation's error; the event is refetched either way.
        }
    }, [close, closeBody, onDoneAction, suspend, suspendBody]);

    return {
        draft,
        kind,
        setCloseKind,
        handleGroundChange,
        handleRuleChange,
        handleOperationalReasonChange,
        handleExplanationChange,
        handleNoteChange,
        explanationLength: trimLikeBackend(draft.explanation).length,
        canConfirm: Boolean(suspendBody ?? closeBody) && !mutation.isPending,
        confirm,
        isConfirming: mutation.isPending,
        error: mutation.error,
    };
}
