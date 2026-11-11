'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { invitationDraftKeys, type InvitationDraftSummaryDto } from '@/lib/invitation/drafts';

// The signed-in host's drafts: their own and those of the events they host.
export function useInvitationDrafts({ enabled = true }: { enabled?: boolean } = {}) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: invitationDraftKeys.list(),
        queryFn: () => api.get<InvitationDraftSummaryDto[]>(endpoints.invitationDrafts.root),
        enabled: enabled && isAuthenticated,
    });
}
