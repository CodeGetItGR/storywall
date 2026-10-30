'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeleteOutreachProspect } from '@/hooks/useAdminOutreach';

// Remove asks first in a confirmation dialog, then deletes.
export function useOutreachRemoval(prospectId: string, onRemoved: () => void) {
    const { mutateAsync: removeProspect, isPending: isRemoving } = useDeleteOutreachProspect();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<unknown>(null);
    // A removal that finishes after the drawer moved on must not close what is open now.
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const openConfirmation = useCallback(() => setConfirmOpen(true), []);
    const closeConfirmation = useCallback(() => setConfirmOpen(false), []);

    const confirmRemoval = useCallback(async () => {
        setError(null);
        try {
            await removeProspect(prospectId);
            if (!mounted.current) return;
            setConfirmOpen(false);
            onRemoved();
        } catch (caught) {
            if (!mounted.current) return;
            setConfirmOpen(false);
            setError(caught);
        }
    }, [onRemoved, prospectId, removeProspect]);

    return { confirmOpen, openConfirmation, closeConfirmation, confirmRemoval, isRemoving, error };
}
