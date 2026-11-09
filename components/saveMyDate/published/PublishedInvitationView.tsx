import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { PublishedInvitationNotice } from '@/components/saveMyDate/published/PublishedInvitationNotice';
import type { PublishedInvitationLabels, PublishedInvitationState } from '@/lib/invitation/publishedInvitation';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type PublishedInvitationViewProps = {
    state: PublishedInvitationState;
    labels: PublishedInvitationLabels;
    uploadedFonts?: InvitationFontDto[];
    // Saves a guest's RSVP reply on the invitation's event.
    sendRsvp?: RsvpSender;
};

// What a guest sees at an invitation's link: the invitation, or why it can't be shown.
export function PublishedInvitationView({ state, labels, uploadedFonts, sendRsvp }: PublishedInvitationViewProps) {
    switch (state.kind) {
        case 'found': {
            const { document, theme, media } = state.invitation;
            return <InvitationRenderer document={document} theme={theme} media={media} uploadedFonts={uploadedFonts} sendRsvp={sendRsvp} />;
        }
        case 'not-found':
            return <PublishedInvitationNotice title={labels.notFound} />;
        case 'expired':
            return <PublishedInvitationNotice title={labels.expired} />;
        case 'error':
            return <PublishedInvitationNotice title={labels.loadFailed} retryLabel={labels.retry} />;
    }
}
