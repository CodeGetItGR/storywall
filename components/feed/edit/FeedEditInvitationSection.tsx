'use client';

import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import { useEditableRenderContext } from '@/hooks/useEditableRenderContext';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection as Section } from '@/lib/invitation/sections';

type FeedEditInvitationSectionProps = { section: Section; index: number; ctx: RenderContext };

// A Save my date block in edit mode: drawn as on the feed, with its text typed in place.
export function FeedEditInvitationSection({ section, index, ctx }: FeedEditInvitationSectionProps) {
    const editableCtx = useEditableRenderContext(ctx);
    return <InvitationSection section={section} index={index} ctx={editableCtx} />;
}
