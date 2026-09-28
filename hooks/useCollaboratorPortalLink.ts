'use client';

import { useCallback, useState } from 'react';

import { useIssueCollaboratorPortalToken } from '@/hooks/useAdmin';
import { useCopyText } from '@/hooks/useCopyText';
import type { CollaboratorResponseDto } from '@/lib/api/types';

// The URL is readable exactly once; it lives in state only and is never persisted.
export function useCollaboratorPortalLink(collaborator: CollaboratorResponseDto) {
    const issueToken = useIssueCollaboratorPortalToken();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
    const { copied, copy } = useCopyText(issuedUrl ?? '');

    const issue = useCallback(async () => {
        try {
            const result = await issueToken.mutateAsync(collaborator.id);
            setIssuedUrl(result.portalUrl);
            setConfirmOpen(false);
        } catch {
            // Shown through error.
        }
    }, [collaborator.id, issueToken]);

    // Replacing dead-links the current URL, so only that path asks first.
    const requestIssue = useCallback(() => {
        if (collaborator.portalTokenIssued) setConfirmOpen(true);
        else void issue();
    }, [collaborator.portalTokenIssued, issue]);

    const closeConfirm = useCallback(() => setConfirmOpen(false), []);

    return {
        issuedUrl,
        confirmOpen,
        requestIssue,
        closeConfirm,
        issue,
        isIssuing: issueToken.isPending,
        error: issueToken.error,
        copied,
        copy,
    };
}
