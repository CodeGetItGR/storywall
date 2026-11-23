import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FeedTopFrame, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import type { FeedTopView } from '@/hooks/useFeedTop';
import { defaultFeedLayout, feedFrame } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';

afterEach(cleanup);

function renderFrame(mode: FeedPageMode) {
    const document = defaultFeedLayout();
    const frame = feedFrame(document, { ended: false });
    const view = { frame, sections: document.sections } as unknown as FeedTopView;
    render(
        <FeedTopFrame
            view={view}
            mode={mode}
            modeSwitch={mode === 'single' ? undefined : <span>pill</span>}
            parts={PLAIN_PARTS}
            cover={<span>cover</span>}
            stories={<span>stories</span>}
            description={<span>description</span>}
            rsvp={<span>rsvp</span>}
            afterMiddle={<span>add</span>}
        />,
    );
    return ['cover', 'pill', 'stories', 'description', 'add', 'rsvp'].filter((text) => screen.queryByText(text));
}

describe('FeedTopFrame', () => {
    it('draws the invitation: cover, switch, the middle and RSVP, without stories', () => {
        expect(renderFrame('invitation')).toEqual(['cover', 'pill', 'description', 'add', 'rsvp']);
    });

    it('draws the feed: cover, switch and stories', () => {
        expect(renderFrame('feed')).toEqual(['cover', 'pill', 'stories']);
    });

    it("draws one page without the switch, in today's order, nothing folded", () => {
        expect(renderFrame('single')).toEqual(['cover', 'stories', 'description', 'add', 'rsvp']);
    });
});
