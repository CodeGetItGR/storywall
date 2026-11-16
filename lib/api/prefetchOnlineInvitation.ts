import type { QueryClient } from '@tanstack/react-query';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import { invitationDraftKeys, type InvitationDraftSummaryDto } from '@/lib/invitation/drafts';
import { type InvitationPublicationDto, invitationPublicationKeys } from '@/lib/invitation/publication';

// The online invitation: the host's drafts, and the published copy of the one on this event (see
// useEventOnlineInvitation). Each seeds on its own; a failure leaves it to the client.
export async function prefetchOnlineInvitation(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const drafts = await serverGet<InvitationDraftSummaryDto[]>(endpoints.invitationDrafts.root, accessToken).catch(() => null);
        if (!drafts) return;
        queryClient.setQueryData(invitationDraftKeys.list(), drafts);
        const draft = drafts.find((item) => item.eventId === eventId);
        if (!draft) return;
        const publication = await serverGetOrNull<InvitationPublicationDto>(endpoints.invitationDrafts.publication(draft.id), accessToken).catch(
            () => undefined,
        );
        if (publication !== undefined) queryClient.setQueryData(invitationPublicationKeys.detail(draft.id), publication);
    } catch {
        // Best-effort — useEventOnlineInvitation fetches normally on the client if this fails.
    }
}
