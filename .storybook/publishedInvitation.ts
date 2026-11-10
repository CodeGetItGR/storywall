import { storyInvitationMedia } from '@/.storybook/invitation';
import type { PublishedInvitationLabels, PublishedInvitationState } from '@/lib/invitation/publishedInvitation';
import { PREVIEW_THEME, previewDocument } from '@/lib/saveMyDatePreview';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The published page's copy, as getPublishedInvitationLabels reads it on the server.
function labelsFrom(messages: typeof en): PublishedInvitationLabels {
    return {
        title: messages.PublishedInvitation.metaTitle,
        notFound: messages.PublishedInvitation.notFound,
        expired: messages.PublishedInvitation.expired,
        loadFailed: messages.InvitationEditor.loadFailed,
        retry: messages.PageErrorState.retry,
    };
}

export const PUBLISHED_LABELS = { en: labelsFrom(en), el: labelsFrom(el) };

export const FOUND_STATE: PublishedInvitationState = {
    kind: 'found',
    invitation: { document: previewDocument(), theme: PREVIEW_THEME, media: storyInvitationMedia },
};
