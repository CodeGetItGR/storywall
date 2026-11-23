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
            editRow={<span>edit row</span>}
            dateRow={<span>date</span>}
        />,
    );
    return ['cover', 'pill', 'edit row', 'date', 'stories', 'description', 'add', 'rsvp'].filter((text) => screen.queryByText(text));
}

describe('FeedTopFrame', () => {
    it('draws the invitation: cover, switch, edit row, the middle and RSVP, without stories or the date row', () => {
        expect(renderFrame('invitation')).toEqual(['cover', 'pill', 'edit row', 'description', 'add', 'rsvp']);
    });

    it('draws the feed: cover, switch, edit row, the date row and stories', () => {
        expect(renderFrame('feed')).toEqual(['cover', 'pill', 'edit row', 'date', 'stories']);
    });

    it("draws one page without the switch or the date row, in today's order, nothing folded", () => {
        expect(renderFrame('single')).toEqual(['cover', 'edit row', 'stories', 'description', 'add', 'rsvp']);
    });

    it('draws RSVP where the host put it on Save my date, in Invitation mode only', () => {
        const document = defaultFeedLayout();
        const [cover, details, description, rsvp] = document.sections;
        const moved = { ...document, sections: [cover, details, rsvp, description] };
        const frame = feedFrame(moved, { ended: false, rsvpMoves: true });
        const view = { frame, sections: moved.sections } as unknown as FeedTopView;
        const draw = (mode: FeedPageMode) => {
            render(
                <FeedTopFrame
                    view={view}
                    mode={mode}
                    parts={PLAIN_PARTS}
                    cover={<span>cover</span>}
                    stories={<span>stories</span>}
                    description={<span>description</span>}
                    rsvp={<span>rsvp</span>}
                />,
            );
            const order = ['cover', 'stories', 'rsvp', 'description'].filter((text) => screen.queryByText(text));
            cleanup();
            return order;
        };
        expect(draw('invitation')).toEqual(['cover', 'rsvp', 'description']);
        expect(draw('feed')).toEqual(['cover', 'stories']);
    });
});
