'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { partnerApplicationKeys, useApprovePartnerApplication, usePartnerProgramSummary } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { type ApplicationErrorKind, applicationErrorKind, foundingCheckbox } from '@/lib/adminPartnerApplications';
import type { AdminErrorMessageKey } from '@/lib/adminUtils';
import { pushPageEntry } from '@/lib/overlayHistory';

export type FoundingLabelKind = 'unknown' | 'none' | 'available';

// "Not pending" closes the dialog instead, so it has no line here. A full-spots error is
// dropped once the box itself says there are none left.
function errorMessageKeyFor(error: ApplicationErrorKind | null, foundingLabel: FoundingLabelKind): AdminErrorMessageKey | null {
    if (!error || error.kind === 'notPending') return null;
    if (error.kind === 'foundingFull') return foundingLabel === 'none' ? null : 'foundingSpotsFull';
    if (error.kind === 'emailExists') return 'collaboratorEmailExists';
    return 'generic';
}

function existingPartnerHashFor(error: ApplicationErrorKind | null): string | null {
    return error?.kind === 'emailExists' && error.collaboratorId ? formatCollaborationsHash(error.collaboratorId) : null;
}

export function usePartnerApplicationApprove(applicationId: string, onNotPending?: () => void) {
    const queryClient = useQueryClient();
    const approve = useApprovePartnerApplication();
    const [isOpen, setIsOpen] = useState(false);
    const summary = usePartnerProgramSummary(isOpen);
    const summaryLoading = summary.isLoading;
    const summaryFailed = summary.isError && !summary.data;
    const spotsLeft = summary.data?.foundingSpotsLeft ?? null;
    const checkbox = foundingCheckbox(spotsLeft);
    const foundingDisabled = checkbox.disabled || summaryLoading || summaryFailed;
    let foundingLabel: FoundingLabelKind = 'available';
    if (summaryLoading || summaryFailed || spotsLeft === null) foundingLabel = 'unknown';
    else if (checkbox.disabled) foundingLabel = 'none';
    // Until the admin touches the box it follows the count: ticked while a spot is left, never ticked at 0.
    const [foundingChoice, setFoundingChoice] = useState<boolean | null>(null);
    const founding = !foundingDisabled && (foundingChoice ?? checkbox.defaultChecked);

    // History is only pushed once the dialog has released its own entry, or Back needs a second press.
    const pendingHash = useRef<string | null>(null);
    const flushNavigation = useCallback(() => {
        const hash = pendingHash.current;
        if (!hash) return;
        pendingHash.current = null;
        pushPageEntry(hash);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    useEffect(() => {
        if (!isOpen) flushNavigation();
    }, [isOpen, flushNavigation]);

    // The page may re-render from the approved application and drop this component first.
    useEffect(() => flushNavigation, [flushNavigation]);

    const error = applicationErrorKind(approve.error);

    const open = useCallback(() => {
        approve.reset();
        setFoundingChoice(null);
        setIsOpen(true);
    }, [approve]);

    const close = useCallback(() => setIsOpen(false), []);

    const handleFoundingChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setFoundingChoice(event.target.checked), []);

    const confirm = useCallback(async () => {
        try {
            const { collaboratorId } = await approve.mutateAsync({ id: applicationId, founding });
            // Collaborations picks its partner from the list, so the new one has to be in it first.
            await queryClient.refetchQueries({ queryKey: adminKeys.collaborators });
            pendingHash.current = formatCollaborationsHash(collaboratorId);
            setIsOpen(false);
        } catch (caught) {
            const kind = applicationErrorKind(caught);
            if (kind?.kind === 'foundingFull') await summary.refetch();
            // Someone else decided it: show the decision on the page instead of the dialog.
            if (kind?.kind === 'notPending') {
                setIsOpen(false);
                onNotPending?.();
                await queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            }
        }
    }, [applicationId, approve, founding, onNotPending, queryClient, summary]);

    const existingPartnerHash = existingPartnerHashFor(error);

    const approveError = approve.error;
    const openExistingPartner = useCallback(() => {
        const hash = existingPartnerHashFor(applicationErrorKind(approveError));
        if (!hash) return;
        pendingHash.current = hash;
        setIsOpen(false);
    }, [approveError]);

    return {
        isOpen,
        open,
        close,
        confirm,
        founding,
        foundingDisabled,
        foundingLabel,
        summaryLoading,
        summaryFailed,
        spotsLeft,
        spotsTotal: summary.data?.foundingSpotsTotal ?? null,
        handleFoundingChange,
        isPending: approve.isPending,
        error,
        errorMessageKey: errorMessageKeyFor(error, foundingLabel),
        existingPartnerHash,
        openExistingPartner,
    };
}
