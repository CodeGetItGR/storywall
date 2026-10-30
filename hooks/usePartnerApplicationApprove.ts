'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useState } from 'react';

import { partnerApplicationKeys, useApprovePartnerApplication, usePartnerProgramSummary } from '@/hooks/useAdminPartnerApplications';
import { formatCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { type ApplicationErrorKind, applicationErrorKind, foundingCheckbox } from '@/lib/adminPartnerApplications';
import type { AdminErrorMessageKey } from '@/lib/adminUtils';
import { pushPageEntry } from '@/lib/overlayHistory';

// "Not pending" closes the dialog instead, so it has no line here.
function errorMessageKeyFor(error: ApplicationErrorKind | null): AdminErrorMessageKey | null {
    if (!error || error.kind === 'notPending') return null;
    if (error.kind === 'foundingFull') return 'foundingSpotsFull';
    if (error.kind === 'emailExists') return 'collaboratorEmailExists';
    return 'generic';
}

export function usePartnerApplicationApprove(applicationId: string) {
    const queryClient = useQueryClient();
    const approve = useApprovePartnerApplication();
    const [isOpen, setIsOpen] = useState(false);
    const summary = usePartnerProgramSummary(isOpen);
    const spotsLeft = summary.data?.foundingSpotsLeft ?? null;
    const checkbox = foundingCheckbox(spotsLeft);
    // Until the admin touches the box it follows the count: ticked while a spot is left, never ticked at 0.
    const [foundingChoice, setFoundingChoice] = useState<boolean | null>(null);
    const founding = !checkbox.disabled && (foundingChoice ?? checkbox.defaultChecked);

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
            setIsOpen(false);
            pushPageEntry(formatCollaborationsHash(collaboratorId));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (caught) {
            const kind = applicationErrorKind(caught);
            if (kind?.kind === 'foundingFull') await summary.refetch();
            // Someone else decided it: show the decision on the page instead of the dialog.
            if (kind?.kind === 'notPending') {
                setIsOpen(false);
                await queryClient.invalidateQueries({ queryKey: partnerApplicationKeys.all });
            }
        }
    }, [applicationId, approve, founding, queryClient, summary]);

    return {
        isOpen,
        open,
        close,
        confirm,
        founding,
        foundingDisabled: checkbox.disabled,
        spotsLeft,
        spotsTotal: summary.data?.foundingSpotsTotal ?? null,
        handleFoundingChange,
        isPending: approve.isPending,
        error,
        errorMessageKey: errorMessageKeyFor(error),
        existingPartnerHash: error?.kind === 'emailExists' && error.collaboratorId ? formatCollaborationsHash(error.collaboratorId) : null,
    };
}
