import { Fragment, type ReactNode } from 'react';

import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { InvitationFoldRow } from '@/components/feed/layout/InvitationFoldRow';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { shellsFeedBlock } from '@/lib/feedLayout';
import type { InvitationSection as Section } from '@/lib/invitation/sections';

const MIDDLE_ID = 'feed-invitation';

type FeedTopProps = {
    view: FeedTopView;
    cover: ReactNode;
    details: ReactNode;
    stories: ReactNode;
    description: ReactNode;
    // null when today's rules don't ask this member to reply.
    rsvp: ReactNode | null;
};

// The top of the feed in its fixed frame: cover, details, stories, the host's middle blocks
// (folded for returning members once there are two or more), RSVP.
export function FeedTop({ view, cover, details, stories, description, rsvp }: FeedTopProps) {
    const { ctx, frame, sections, themeId, look } = view;

    function block(section: Section, content: ReactNode) {
        const native = <FeedNative on={look}>{content}</FeedNative>;
        if (!shellsFeedBlock(themeId, section)) return <Fragment key={section.id}>{native}</Fragment>;
        return (
            <FeedBlockShell key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx}>
                {native}
            </FeedBlockShell>
        );
    }

    const middle = frame.middle.map((section) =>
        section.type === 'feedDescription' ? block(section, description) : <InvitationSection key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx} />,
    );

    return (
        <FeedLook on={look} ctx={ctx} lang={view.lang} fontFaces={view.fontFaces}>
            {/* Cover */}
            {block(frame.cover, cover)}

            {/* Details */}
            {frame.details && block(frame.details, details)}

            {/* Stories */}
            {stories && <FeedNative on={look}>{stories}</FeedNative>}

            {/* Invitation */}
            {view.folds && (
                <FeedNative on={look}>
                    <InvitationFoldRow open={view.open} onToggle={view.toggle} controls={MIDDLE_ID} />
                </FeedNative>
            )}
            {view.folds && view.open && <div id={MIDDLE_ID}>{middle}</div>}
            {!view.folds && middle}

            {/* RSVP */}
            {frame.rsvp && rsvp && block(frame.rsvp, rsvp)}
        </FeedLook>
    );
}
