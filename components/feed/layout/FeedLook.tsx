import '@/components/saveMyDate/invitation/invitation.css';
import '@/components/saveMyDate/invitation/effects/effects.css';
import './feedLayout.css';

import type { ReactNode } from 'react';

import { InvitationMotionRoot } from '@/components/saveMyDate/invitation/effects/InvitationMotionRoot';
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { type RenderContext, themeCssVars } from '@/lib/invitation/render';

type FeedLookProps = { on: boolean; ctx: RenderContext; lang: string; fontFaces: string; children: ReactNode };

// The invitation root around the top of the feed, for theme fonts, colours and effects. Off, the
// children draw as today's feed.
export function FeedLook({ on, ctx, lang, fontFaces, children }: FeedLookProps) {
    if (!on) return <>{children}</>;

    return (
        <InvitationMotionRoot textAnimation={ctx.theme.textAnimation} lang={lang} className={`smd-invitation feed-look ${INVITATION_FONT_CLASSES}`} style={themeCssVars(ctx)}>
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {fontFaces && <style>{fontFaces}</style>}
            {children}
        </InvitationMotionRoot>
    );
}

// One of today's feed blocks inside the invitation root: shielded from the invitation's own element
// styles (feedLayout.css). Off, nothing is added around it.
export function FeedNative({ on, children }: { on: boolean; children: ReactNode }) {
    if (!on) return <>{children}</>;
    return <div className="feed-native">{children}</div>;
}
