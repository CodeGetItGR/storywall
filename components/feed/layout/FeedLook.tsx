import '@/components/saveMyDate/invitation/invitation.css';
import '@/components/saveMyDate/invitation/effects/effects.css';
import './feedLayout.css';

import type { ReactNode } from 'react';

import { InvitationMotionRoot } from '@/components/saveMyDate/invitation/effects/InvitationMotionRoot';
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { type RenderContext, themeCssVars } from '@/lib/invitation/render';
import { cn } from '@/lib/utils';

type FeedLookProps = { ctx: RenderContext; lang: string; fontFaces: string; children: ReactNode };

// The invitation root around the top of the feed, for theme fonts, colours and effects.
export function FeedLook({ ctx, lang, fontFaces, children }: FeedLookProps) {
    return (
        <InvitationMotionRoot
            textAnimation={ctx.theme.textAnimation}
            lang={lang}
            className={`smd-invitation feed-look ${INVITATION_FONT_CLASSES}`}
            style={themeCssVars(ctx)}
        >
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {fontFaces && <style>{fontFaces}</style>}
            {children}
        </InvitationMotionRoot>
    );
}

// One of today's feed blocks inside the invitation root: shielded from the invitation's own element
// styles (feedLayout.css). Edit mode passes a class for its own tools.
export function FeedNative({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('feed-native', className)}>{children}</div>;
}
