import { Fragment, type ReactNode } from 'react';

import type { FeedTopView } from '@/hooks/useFeedTop';
import { type FeedAddPlace, isHostBlock } from '@/lib/feedEditing';
import type { FeedPageMode } from '@/lib/feedMode';
import type { InvitationSection } from '@/lib/invitation/sections';

export type FeedTopProps = {
    view: FeedTopView;
    // Which mode is on screen; 'single' (no Save my date) is the one page with everything.
    mode?: FeedPageMode;
    // The Invitation | Social Feed pill, under the cover.
    modeSwitch?: ReactNode;
    // Edit mode's Theme, Cancel and Save, under the cover or the switch's room; a host's Edit pencil on a page without a switch.
    editRow?: ReactNode;
    // Social Feed mode's date + place row, under the pill.
    dateRow?: ReactNode;
    cover: ReactNode;
    stories: ReactNode;
    description: ReactNode;
    // null when today's rules don't ask this member to reply.
    rsvp: ReactNode | null;
    // What a feed module block draws (plan 7c). Without it, module blocks draw nothing.
    moduleBlock?: (section: InvitationSection) => ReactNode;
    // Edit mode's "+ Add section" rows (plan 7c): one after each host block; with none, one row (null).
    between?: (place: FeedAddPlace) => ReactNode;
    // Draws one of Feed mode's sections (FeedModeSection), given by the page.
    feedSection?: (section: InvitationSection) => ReactNode;
    // Edit mode's Add section row after the feed sections.
    afterFeed?: ReactNode;
};

// How the frame draws its pieces: plainly, or in the invitation look (FeedLookTop).
export type FeedTopParts = {
    // One of the feed's own blocks.
    block: (section: InvitationSection, content: ReactNode) => ReactNode;
    // Today's markup that is not a block: stories and the switch.
    native: (content: ReactNode) => ReactNode;
    // A Save my date block.
    invitation: (section: InvitationSection) => ReactNode;
    // One of Feed mode's sections: the app's own look, on the page.
    feed: (section: InvitationSection, content: ReactNode) => ReactNode;
};

// The plain feed: today's markup with nothing around it. Its layout holds only the feed's own blocks.
export const PLAIN_PARTS: FeedTopParts = {
    block: (section, content) => <Fragment key={section.id}>{content}</Fragment>,
    native: (content) => content,
    invitation: () => null,
    feed: (section, content) => <Fragment key={section.id}>{content}</Fragment>,
};

// The top of the feed in its fixed frame. Invitation: cover, switch, the host's blocks (RSVP among them on Save my
// date), RSVP last otherwise. Social Feed: cover, switch, the date row, stories, feed sections (posts follow on the
// page). One page: everything, nothing folded, the feed sections last. The edit row sits under the switch, or under the cover without one.
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
    moduleBlock,
    between,
    feedSection,
    afterFeed,
    parts,
}: FeedTopProps & { parts: FeedTopParts }) {
    const { frame } = view;
    const invitation = mode !== 'feed';
    // RSVP is in the middle on Save my date (lib/feedLayout feedFrame); it draws only while today's rules ask.
    const drawMiddle = (section: InvitationSection) => {
        if (section.type === 'feedDescription') return parts.block(section, description);
        if (section.type === 'feedRsvp') return rsvp ? parts.block(section, rsvp) : null;
        if (section.type === 'feedModule') return moduleBlock ? parts.block(section, moduleBlock(section)) : null;
        return parts.invitation(section);
    };
    const options = { rsvpMoves: view.rsvpMoves };
    const hasHostBlocks = frame.middle.some((section) => isHostBlock(section, options));
    const middle = frame.middle.map((section) => (
        <Fragment key={section.id}>
            {drawMiddle(section)}
            {between && isHostBlock(section, options) && between({ after: section.id })}
        </Fragment>
    ));

    const feed = (
        <>
            {feedSection && frame.feed.map((section) => parts.feed(section, feedSection(section)))}
            {afterFeed}
        </>
    );

    return (
        <>
            {/* Cover */}
            {parts.block(frame.cover, cover)}

            {/* Invitation | Social Feed switch */}
            {modeSwitch && parts.native(modeSwitch)}

            {/* Theme, Cancel and Save, or the Edit pencil */}
            {editRow && parts.native(editRow)}

            {/* Date and place */}
            {mode === 'feed' && dateRow && parts.native(dateRow)}

            {/* Stories */}
            {mode !== 'invitation' && stories && parts.native(stories)}

            {/* Feed sections: under the stories in Feed mode */}
            {mode === 'feed' && feed}

            {/* Invitation sections */}
            {invitation && middle}
            {invitation && between && !hasHostBlocks && between(null)}

            {/* RSVP */}
            {invitation && frame.rsvp && rsvp && parts.block(frame.rsvp, rsvp)}

            {/* Feed sections: right above the posts on the one page */}
            {mode === 'single' && feed}
        </>
    );
}
