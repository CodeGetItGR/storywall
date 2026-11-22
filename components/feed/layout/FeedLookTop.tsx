import { Fragment, type ReactNode } from 'react';

import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps } from '@/components/feed/layout/FeedTopFrame';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { shellsFeedBlock } from '@/lib/feedLayout';
import type { InvitationSection as Section } from '@/lib/invitation/sections';

// How the invitation look draws each piece of the frame. Edit mode wraps these in its tools.
export function feedLookParts(view: FeedTopView): FeedTopParts {
    const { ctx, sections, themeId } = view;
    const native = (content: ReactNode) => <FeedNative>{content}</FeedNative>;
    return {
        block: (section: Section, content: ReactNode) =>
            shellsFeedBlock(themeId, section) ? (
                <FeedBlockShell key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx}>
                    {native(content)}
                </FeedBlockShell>
            ) : (
                <Fragment key={section.id}>{native(content)}</Fragment>
            ),
        native,
        invitation: (section: Section) => <InvitationSection key={section.id} section={section} index={sections.indexOf(section)} ctx={ctx} />,
    };
}

// The top of the feed in the invitation look: theme fonts, colours and effects, with Save my date
// blocks. FeedTop loads it only for a layout that uses the look, so the plain feed skips its styles.
export function FeedLookTop(props: FeedTopProps) {
    return (
        <FeedLook ctx={props.view.ctx} lang={props.view.lang} fontFaces={props.view.fontFaces}>
            <FeedTopFrame {...props} parts={feedLookParts(props.view)} />
        </FeedLook>
    );
}
