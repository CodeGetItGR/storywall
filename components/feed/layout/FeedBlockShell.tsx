import type { ReactNode } from 'react';

import { SectionEffectLayer } from '@/components/saveMyDate/invitation/effects/SectionEffectLayer';
import { SectionTransition } from '@/components/saveMyDate/invitation/effects/SectionTransition';
import { type RenderContext, sectionShell } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type FeedBlockShellProps = { section: InvitationSection; index: number; ctx: RenderContext; children: ReactNode };

// A feed block in its invitation style: background, effect and transition art around today's block.
export function FeedBlockShell({ section, index, ctx, children }: FeedBlockShellProps) {
    const shell = sectionShell(section, index, ctx);

    return (
        <section className={`${shell.className} feed-block`} style={shell.style} data-section-id={section.id}>
            {/* Background effect */}
            {shell.effect && <SectionEffectLayer effect={shell.effect} backgroundStyle={shell.effectBackground.style} hasThemeImage={shell.effectBackground.hasThemeImage} />}

            {/* Content */}
            <div className="relative">{children}</div>

            {/* Transition art */}
            {shell.transition && <SectionTransition art={shell.transition} />}
        </section>
    );
}
