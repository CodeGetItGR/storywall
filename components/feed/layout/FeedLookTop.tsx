import { Fragment, type ReactNode } from 'react';

import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps } from '@/components/feed/layout/FeedTopFrame';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import { shellsFeedBlock } from '@/lib/feedLayout';
import type { InvitationSection as Section } from '@/lib/invitation/sections';

// The top of the feed in the invitation look: theme fonts, colours and effects, with Save my date
// blocks. FeedTop loads it only for a layout that uses the look, so the plain feed skips its styles.
export function FeedLookTop(props: FeedTopProps) {
    const { ctx, sections, themeId } = props.view;
    const native = (content: ReactNode) => <FeedNative>{content}</FeedNative>;
    const parts: FeedTopParts = {
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

    return (
        <FeedLook ctx={ctx} lang={props.view.lang} fontFaces={props.view.fontFaces}>
            <FeedTopFrame {...props} parts={parts} />
        </FeedLook>
    );
}
