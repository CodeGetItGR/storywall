'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminCollaborators } from '@/hooks/useAdmin';
import {
    useAdminEventPartnerBranding,
    useLinkEventPartnerBranding,
    usePartnerBrandingReport,
    useUnlinkEventPartnerBranding,
} from '@/hooks/useAdminPartnerBranding';
import { reportDateInputValue, reportRangeBound } from '@/lib/adminPartnerBranding';
import { isUuid } from '@/lib/adminUtils';

/** The event id the admin looks up; the link loads once the id is a valid UUID. */
export function usePartnerCardEventLookup() {
    const [input, setInput] = useState('');
    const [eventId, setEventId] = useState<string | null>(null);
    const [invalid, setInvalid] = useState(false);
    const link = useAdminEventPartnerBranding(eventId);

    const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setInput(event.currentTarget.value);
        setInvalid(false);
    }, []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const id = input.trim();
            if (!isUuid(id)) {
                setInvalid(true);
                return;
            }
            setEventId(id);
        },
        [input],
    );

    return { input, eventId, invalid, link, handleInputChange, handleSubmit };
}

/** Linking, replacing and removing the partner on one event. Only partners with a card on can be linked. */
export function usePartnerCardEventLink(eventId: string, linkedCollaboratorId: string | null) {
    const collaborators = useAdminCollaborators();
    const link = useLinkEventPartnerBranding(eventId);
    const unlink = useUnlinkEventPartnerBranding(eventId);
    const [collaboratorId, setCollaboratorId] = useState('');
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    const options = useMemo(
        () =>
            (collaborators.data ?? [])
                .filter((collaborator) => collaborator.brandingEnabled && collaborator.id !== linkedCollaboratorId)
                .map((collaborator) => ({ id: collaborator.id, label: collaborator.brandingDisplayName ?? collaborator.name })),
        [collaborators.data, linkedCollaboratorId],
    );

    const handleCollaboratorChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            setCollaboratorId(event.currentTarget.value);
            link.reset();
        },
        [link],
    );

    const handleLink = useCallback(async () => {
        if (!collaboratorId) return;
        unlink.reset();
        try {
            await link.mutateAsync({ collaboratorId });
            setCollaboratorId('');
        } catch {
            // Shown through error.
        }
    }, [collaboratorId, link, unlink]);

    const openRemove = useCallback(() => {
        link.reset();
        unlink.reset();
        setConfirmingRemove(true);
    }, [link, unlink]);

    const closeRemove = useCallback(() => setConfirmingRemove(false), []);

    const confirmRemove = useCallback(async () => {
        try {
            await unlink.mutateAsync();
            setConfirmingRemove(false);
        } catch {
            // Shown through error.
        }
    }, [unlink]);

    return {
        options,
        optionsLoading: collaborators.isLoading,
        collaboratorId,
        handleCollaboratorChange,
        handleLink,
        isLinking: link.isPending,
        confirmingRemove,
        openRemove,
        closeRemove,
        confirmRemove,
        isRemoving: unlink.isPending,
        error: link.error ?? unlink.error ?? collaborators.error,
    };
}

/** The report range. Empty dates use the server's default (the last 30 days), shown in the inputs once loaded. */
export function usePartnerCardsReport() {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const report = usePartnerBrandingReport({ from: reportRangeBound(fromDate, 'from'), to: reportRangeBound(toDate, 'to') });

    const handleFromChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setFromDate(event.currentTarget.value), []);
    const handleToChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setToDate(event.currentTarget.value), []);

    return {
        report,
        fromValue: fromDate || reportDateInputValue(report.data?.from),
        toValue: toDate || reportDateInputValue(report.data?.to),
        handleFromChange,
        handleToChange,
    };
}
