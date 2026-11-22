import { Fragment, type ReactNode } from 'react';

import { InvitationFoldRow } from '@/components/feed/layout/InvitationFoldRow';
import type { FeedTopView } from '@/hooks/useFeedTop';
import type { InvitationSection } from '@/lib/invitation/sections';

const MIDDLE_ID = 'feed-invitation';

export type FeedTopProps = {
    view: FeedTopView;
    cover: ReactNode;
    details: ReactNode;
    stories: ReactNode;
    description: ReactNode;
    // null when today's rules don't ask this member to reply.
    rsvp: ReactNode | null;
    // Edit mode's Add section row, after the middle blocks.
    afterMiddle?: ReactNode;
};

// How the frame draws its pieces: plainly, or in the invitation look (FeedLookTop).
export type FeedTopParts = {
    // One of the feed's own blocks.
    block: (section: InvitationSection, content: ReactNode) => ReactNode;
    // Today's markup that is not a block: stories and the Invitation row.
    native: (content: ReactNode) => ReactNode;
    // A Save my date block.
    invitation: (section: InvitationSection) => ReactNode;
};

// The plain feed: today's markup with nothing around it. Its layout holds only the feed's own blocks.
export const PLAIN_PARTS: FeedTopParts = {
    block: (section, content) => <Fragment key={section.id}>{content}</Fragment>,
    native: (content) => content,
    invitation: () => null,
};

// The top of the feed in its fixed frame: cover, details, stories, the host's middle blocks
// (folded for returning members once there are two or more), RSVP.
export function FeedTopFrame({ view, cover, details, stories, description, rsvp, afterMiddle, parts }: FeedTopProps & { parts: FeedTopParts }) {
    const { frame } = view;
    const middle = frame.middle.map((section) =>
        section.type === 'feedDescription' ? parts.block(section, description) : parts.invitation(section),
    );

    return (
        <>
            {/* Cover */}
            {parts.block(frame.cover, cover)}

            {/* Details */}
            {frame.details && parts.block(frame.details, details)}

            {/* Stories */}
            {stories && parts.native(stories)}

            {/* Invitation */}
            {view.folds && parts.native(<InvitationFoldRow open={view.open} onToggle={view.toggle} controls={MIDDLE_ID} />)}
            {view.folds && view.open && <div id={MIDDLE_ID}>{middle}</div>}
            {!view.folds && middle}
            {afterMiddle}

            {/* RSVP */}
            {frame.rsvp && rsvp && parts.block(frame.rsvp, rsvp)}
        </>
    );
}
