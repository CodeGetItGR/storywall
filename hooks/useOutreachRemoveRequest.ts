'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useCreateOutreachRequest } from '@/hooks/useAdminOutreachRequests';

// Marketing's Remove: a dialog asks why, then sends the request to an admin.
export function useOutreachRemoveRequest(prospectId: string) {
    const { mutateAsync: sendRequest, isPending: isSending } = useCreateOutreachRequest();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const openDialog = useCallback(() => {
        setError(null);
        setDialogOpen(true);
    }, []);
    const closeDialog = useCallback(() => setDialogOpen(false), []);

    const handleReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.currentTarget.value), []);

    const confirmRequest = useCallback(async () => {
        if (!reason.trim()) return;
        setError(null);
        try {
            await sendRequest({ kind: 'REMOVE', prospectId, note: reason.trim() });
            if (!mounted.current) return;
            setDialogOpen(false);
            setReason('');
            setSent(true);
        } catch (caught) {
            if (!mounted.current) return;
            setDialogOpen(false);
            setError(caught);
        }
    }, [prospectId, reason, sendRequest]);

    return { dialogOpen, reason, sent, error, isSending, openDialog, closeDialog, handleReasonChange, confirmRequest };
}
