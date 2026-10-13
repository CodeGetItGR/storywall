import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { eventInvitationKeys } from '@/hooks/useEventInvitations';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { EventInvitationPreviewDto } from '@/lib/api/types';
import { isFullPageLoad } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { inviteShareMetadata } from '@/lib/shareMetadata';

import InviteOnboardingPage from './PageClient';

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return inviteShareMetadata((await params).token);
}

// An opened invite link arrives with its invite, so the page skips its skeleton. The lookup is fresh,
// not the link preview's cached one: a used or revoked invite must show as such right away.
export default async function Page({ params }: PageProps) {
    const { token } = await params;
    const queryClient = makeQueryClient();

    if (await isFullPageLoad()) {
        try {
            const preview = await serverPublicGet<EventInvitationPreviewDto>(endpoints.eventInvitations.preview(token));
            queryClient.setQueryData(eventInvitationKeys.preview(token), preview);
        } catch {
            // Best-effort — useEventInvitationPreview fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <InviteOnboardingPage params={params} />
        </HydrationBoundary>
    );
}
