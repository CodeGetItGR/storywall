import { Fragment, type ReactNode } from 'react';

import type { FeedTopView } from '@/hooks/useFeedTop';
import type { FeedPageMode } from '@/lib/feedMode';
import type { InvitationSection } from '@/lib/invitation/sections';

export type FeedTopProps = {
    view: FeedTopView;
    // Which mode is on screen; 'single' (no Save my date) is the one page with everything.
    mode?: FeedPageMode;
    // The Invitation | Social Feed pill, under the cover.
    modeSwitch?: ReactNode;
    // Edit mode's Theme, Cancel and Save, under the cover (and under the pill when it shows).
    editRow?: ReactNode;
    // Social Feed mode's date + place row, under the pill.
    dateRow?: ReactNode;
    cover: ReactNode;
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
    // Today's markup that is not a block: stories and the switch.
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

// The top of the feed in its fixed frame. Invitation: cover, switch, the host's blocks (RSVP among them on Save my
// date), RSVP last otherwise. Social Feed: cover, switch, the date row, stories (posts follow on the page). One page:
// everything, nothing folded. Edit mode's row sits under the switch, or under the cover without one.
export function FeedTopFrame({
    view,
    mode = 'single',
    modeSwitch,
    editRow,
    dateRow,
    cover,
    stories,
    description,
    rsvp,
    afterMiddle,
    parts,
}: FeedTopProps & { parts: FeedTopParts }) {
    const { frame } = view;
    const invitation = mode !== 'feed';
    // RSVP is in the middle on Save my date (lib/feedLayout feedFrame); it draws only while today's rules ask.
    const middle = frame.middle.map((section) => {
        if (section.type === 'feedDescription') return parts.block(section, description);
        if (section.type === 'feedRsvp') return rsvp ? parts.block(section, rsvp) : null;
        return parts.invitation(section);
    });

    return (
        <>
            {/* Cover */}
            {parts.block(frame.cover, cover)}

            {/* Invitation | Social Feed switch */}
            {modeSwitch && parts.native(modeSwitch)}

            {/* Theme, Cancel and Save */}
            {editRow && parts.native(editRow)}

            {/* Date and place */}
            {mode === 'feed' && dateRow && parts.native(dateRow)}

            {/* Stories */}
            {mode !== 'invitation' && stories && parts.native(stories)}

            {/* Invitation sections */}
            {invitation && middle}
            {invitation && afterMiddle}

            {/* RSVP */}
            {invitation && frame.rsvp && rsvp && parts.block(frame.rsvp, rsvp)}
        </>
    );
}
