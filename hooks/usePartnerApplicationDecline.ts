'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useState } from 'react';

import { partnerApplicationKeys, useDeclinePartnerApplication } from '@/hooks/useAdminPartnerApplications';
import { applicationErrorKind } from '@/lib/adminPartnerApplications';

export const DECLINE_REASON_MAX = 1000;

export function usePartnerApplicationDecline(applicationId: string) {
    const queryClient = useQueryClient();
    const decline = useDeclinePartnerApplication();
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState('');

    const open = useCallback(() => {
        decline.reset();
        setIsOpen(true);
    }, [decline]);

    const close = useCallback(() => setIsOpen(false), []);

    const handleReasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value), []);

    // On success the page re-renders from the declined application and shows the decision.
    const confirm = useCallback(async () => {
        try {
            await decline.mutateAsync({ id: applicationId, reason: reason.trim() || null });
            setIsOpen(false);
        } catch (caught) {
            if (applicationErrorKind(caught)?.kind === 'notPending') {
                setIsOpen(false);
                await queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            }
        }
    }, [applicationId, decline, queryClient, reason]);

    return { isOpen, open, close, confirm, reason, handleReasonChange, isPending: decline.isPending, error: decline.error };
}
