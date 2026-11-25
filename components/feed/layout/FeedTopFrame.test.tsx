import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FeedTopFrame, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import type { FeedTopView } from '@/hooks/useFeedTop';
import type { FeedAddPlace } from '@/lib/feedEditing';
import { defaultFeedLayout, feedFrame } from '@/lib/feedLayout';
import type { FeedPageMode } from '@/lib/feedMode';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

afterEach(cleanup);

const row = (place: FeedAddPlace) => <i>{place ? JSON.stringify(place) : 'end'}</i>;
const addRow = (place: FeedAddPlace) => <span>{place ? JSON.stringify(place) : 'add'}</span>;
const prompt = { ...SAMPLE_SECTIONS.feedPrompt, id: 'p' } as InvitationSection;
const feedSectionOf = () => <span>prompt</span>;
const moduleOf = (section: InvitationSection) => <span>module {section.id}</span>;

function renderFrame(mode: FeedPageMode) {
    const layout = defaultFeedLayout();
    const frame = { ...feedFrame(layout, { ended: false }), feed: [prompt] };
    const view = { frame, sections: layout.sections } as unknown as FeedTopView;
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
            between={addRow}
            feedSection={feedSectionOf}
            afterFeed={<span>add feed</span>}
            editRow={<span>edit row</span>}
            dateRow={<span>date</span>}
        />,
    );
    return Array.from(document.body.querySelectorAll('span'), (node) => node.textContent);
}

describe('FeedTopFrame', () => {
    it('draws the invitation: cover, switch, edit row, the middle and RSVP, without stories, the date row or feed sections', () => {
        expect(renderFrame('invitation')).toEqual([
            'cover',
            'pill',
            'edit row',
            'description',
            '{"after":"feed-feedDescription"}',
            'rsvp',
        ]);
    });

    it('draws the feed: cover, switch, edit row, the date row, stories, then the feed sections', () => {
        expect(renderFrame('feed')).toEqual(['cover', 'pill', 'edit row', 'date', 'stories', 'prompt', 'add feed']);
    });

    it("draws one page without the switch or the date row, in today's order, the feed sections right above the posts", () => {
        expect(renderFrame('single')).toEqual([
            'cover',
            'edit row',
            'stories',
            'description',
            '{"after":"feed-feedDescription"}',
            'rsvp',
            'prompt',
            'add feed',
        ]);
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

    it('draws an Add section row above the first host block and after each, RSVP still last when fixed', () => {
        const base = defaultFeedLayout();
        const block = (id: string) => ({ ...(SAMPLE_SECTIONS.faq as InvitationSection), id });
        const document = { ...base, sections: [base.sections[0], base.sections[1], block('a'), block('b'), base.sections[3]] };
        const frame = feedFrame(document, { ended: false });
        const view = { frame, sections: document.sections, rsvpMoves: false } as unknown as FeedTopView;
        const parts = { ...PLAIN_PARTS, invitation: (section: InvitationSection) => <span key={section.id}>{section.id}</span> };
        const { container } = render(
            <FeedTopFrame
                view={view}
                mode="invitation"
                parts={parts}
                cover={<span>cover</span>}
                stories={null}
                description={null}
                rsvp={<span>rsvp</span>}
                between={row}
            />,
        );
        expect(Array.from(container.querySelectorAll('span, i'), (node) => node.textContent)).toEqual([
            'cover',
            'a',
            '{"after":"a"}',
            'b',
            '{"after":"b"}',
            'rsvp',
        ]);
    });

    it('draws a module block with its part, and nothing without one', () => {
        const document = defaultFeedLayout();
        const block = { id: 'm', type: 'feedModule', visible: true, props: { module: 'playlist' } } as unknown as InvitationSection;
        document.sections.splice(3, 0, block);
        const frame = feedFrame(document, { ended: false });
        const view = { frame, sections: document.sections } as unknown as FeedTopView;
        const frameWith = (moduleBlock?: (section: InvitationSection) => ReactNode) => (
            <FeedTopFrame view={view} mode="invitation" parts={PLAIN_PARTS} cover={<span>cover</span>} stories={null} description={null} rsvp={null} moduleBlock={moduleBlock} />
        );
        const { rerender } = render(frameWith(moduleOf));
        expect(screen.getByText('module m')).toBeTruthy();
        rerender(frameWith(undefined));
        expect(screen.queryByText('module m')).toBeNull();
    });

    it('draws one row with no host blocks', () => {
        const base = defaultFeedLayout();
        const document = { ...base, sections: [base.sections[0], base.sections[1], base.sections[3]] };
        const frame = feedFrame(document, { ended: false });
        const view = { frame, sections: document.sections, rsvpMoves: false } as unknown as FeedTopView;
        render(
            <FeedTopFrame
                view={view}
                mode="invitation"
                parts={PLAIN_PARTS}
                cover={<span>cover</span>}
                stories={null}
                description={null}
                rsvp={<span>rsvp</span>}
                between={row}
            />,
        );
        expect(screen.getAllByText(/end|before|after/).map((node) => node.textContent)).toEqual(['end']);
    });
});

describe("the theme's top illustration", () => {
    const layout = defaultFeedLayout();
    const ctx = { theme: SAMPLE_THEME, media: (id: string) => `/${id}` };
    const view = { frame: feedFrame(layout, { ended: false }), sections: layout.sections, ctx } as unknown as FeedTopView;
    const coverOf = (mode: FeedPageMode) => {
        render(
            <FeedTopFrame
                view={view}
                mode={mode}
                parts={PLAIN_PARTS}
                cover={(topArt) => <span>{topArt?.src ?? 'no art'}</span>}
                stories={null}
                description={null}
                rsvp={null}
            />,
        );
        return document.querySelector('span')?.textContent;
    };

    it.each<[FeedPageMode, string]>([
        ['invitation', '/m-main-art'],
        ['feed', 'no art'],
        ['single', 'no art'],
    ])('goes to the cover in %s mode: %s', (mode, shown) => {
        expect(coverOf(mode)).toBe(shown);
    });
});
