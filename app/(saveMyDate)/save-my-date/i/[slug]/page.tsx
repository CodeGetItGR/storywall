import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublishedInvitationView } from '@/components/saveMyDate/published/PublishedInvitationView';
import { publishedInvitationTitle } from '@/lib/invitation/publishedInvitation';
import { fetchPublishedInvitation, getPublishedInvitationLabels, publishedInvitationRsvpSender } from '@/lib/invitation/serverPublishedInvitation';
import { fetchUploadedFonts } from '@/lib/invitation/serverUploadedFonts';
import { showsSaveMyDate } from '@/lib/saveMyDateRelease';

type PublishedInvitationPageProps = { params: Promise<{ slug: string }> };

// Invitations carry guests' and hosts' personal details: never indexed, never followed.
const INVITATION_ROBOTS: Metadata['robots'] = { index: false, follow: false };

export async function generateMetadata({ params }: PublishedInvitationPageProps): Promise<Metadata> {
    if (!showsSaveMyDate()) return { robots: INVITATION_ROBOTS };
    const { slug } = await params;
    const [state, labels] = await Promise.all([fetchPublishedInvitation(slug), getPublishedInvitationLabels()]);
    return { title: publishedInvitationTitle(state, labels), robots: INVITATION_ROBOTS };
}

// A published invitation, at invite.storywall.gr/<slug> (proxy.ts rewrites it here), drawn on the server.
export default async function PublishedInvitationPage({ params }: PublishedInvitationPageProps) {
    if (!showsSaveMyDate()) notFound();
    const { slug } = await params;
    const [state, labels] = await Promise.all([fetchPublishedInvitation(slug), getPublishedInvitationLabels()]);
    const uploadedFonts = state.kind === 'found' ? await fetchUploadedFonts() : [];
    const sendRsvp = publishedInvitationRsvpSender(slug, state);

    return <PublishedInvitationView state={state} labels={labels} uploadedFonts={uploadedFonts} sendRsvp={sendRsvp} />;
}
