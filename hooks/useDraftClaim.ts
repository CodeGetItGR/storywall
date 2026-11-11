'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { type InvitationDraftDto, invitationDraftKeys } from '@/lib/invitation/drafts';
import { draftTokenHeaders, forgetDraftToken, readDraftToken } from '@/lib/invitation/draftTokens';

// A draft started signed out becomes the account's once the visitor signs in, so it can go on an
// event and be published. Runs as soon as there is a session; claim() waits for it or tries again.
// Resolves true when the draft is the account's (or never had a token here).
export function useDraftClaim(draftId: string) {
    const { isAuthenticated, isBootstrapping } = useAuth();
    const queryClient = useQueryClient();
    const pending = useRef<Promise<boolean> | null>(null);

    const claim = useCallback((): Promise<boolean> => {
        if (!readDraftToken(draftId)) return Promise.resolve(true);
        pending.current ??= (async () => {
            try {
                const claimed = await api.post<InvitationDraftDto>(endpoints.invitationDrafts.claim(draftId), undefined, {
                    headers: draftTokenHeaders(draftId),
                });
                forgetDraftToken(draftId);
                // Only what the claim changed: the editor's saves keep the document current.
                queryClient.setQueryData<InvitationDraftDto>(invitationDraftKeys.detail(draftId), (old) =>
                    old ? { ...old, eventId: claimed.eventId, expiresAt: claimed.expiresAt, token: null } : claimed,
                );
                void queryClient.invalidateQueries({ queryKey: invitationDraftKeys.list() });
                return true;
            } catch (error) {
                // Expired, or another account has it: the token opens nothing any more.
                if (error instanceof ApiError && (error.status === 404 || error.status === 409)) forgetDraftToken(draftId);
                return false;
            } finally {
                pending.current = null;
            }
        })();
        return pending.current;
    }, [draftId, queryClient]);

    useEffect(() => {
        if (isBootstrapping || !isAuthenticated) return;
        void claim();
    }, [claim, isAuthenticated, isBootstrapping]);

    return claim;
}
