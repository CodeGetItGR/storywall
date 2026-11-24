import type { FeedTopParts } from '@/components/feed/layout/FeedTopFrame';

// The frame's pieces while the host previews the feed: drawn as for guests, taking no taps (a link would lose the
// unsaved changes).
export function feedPreviewParts(base: FeedTopParts): FeedTopParts {
    return {
        block: (section, content) => (
            <div key={section.id} inert>
                {base.block(section, content)}
            </div>
        ),
        native: base.native,
        invitation: (section) => (
            <div key={section.id} inert>
                {base.invitation(section)}
            </div>
        ),
        feed: (section, content) => (
            <div key={section.id} inert>
                {base.feed(section, content)}
            </div>
        ),
    };
}
