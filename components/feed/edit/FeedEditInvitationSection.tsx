'use client';

import type { CSSProperties } from 'react';

import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import { useEditableRenderContext } from '@/hooks/useEditableRenderContext';
import { sectionToolsPadding } from '@/lib/feedToolsRoom';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection as Section } from '@/lib/invitation/sections';

type FeedEditInvitationSectionProps = { section: Section; index: number; ctx: RenderContext };

// A Save my date block in edit mode: drawn as on the feed, with its text typed in place and room for its tools over
// its content, on the section's own background.
export function FeedEditInvitationSection({ section, index, ctx }: FeedEditInvitationSectionProps) {
    const editableCtx = useEditableRenderContext(ctx);
    return (
        // Important: invitation.css is unlayered, and a photo's own padding is inline.
        <div className="[&>section]:pt-(--feed-tools-room)!" style={{ '--feed-tools-room': sectionToolsPadding(section) } as CSSProperties}>
            <InvitationSection section={section} index={index} ctx={editableCtx} />
        </div>
    );
}
