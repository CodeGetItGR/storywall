import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyEvent, storyPhotos } from '@/.storybook/fixtures';
import { FeedEditPill } from '@/components/feed/edit/FeedEditPill';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import en from '@/messages/en.json';

vi.mock('@/hooks/useFeedCoverBlock', () => ({
    useFeedCoverBlock: () => ({ pageLoaded: false, onIllustrationError: vi.fn(), giftHref: '/gifts', giftName: 'Gifts' }),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));

const pill = <FeedEditPill onClick={vi.fn()} />;

function renderCover(props: Partial<ComponentProps<typeof FeedCoverBlock>> = {}) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={en}>
                <FeedCoverBlock event={storyEvent()} isHost wishlist={false} {...props} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

const addPhoto = () => screen.queryByRole('link', { name: en.FeedPage.addCoverPhoto });
const session = (key: 'mainSession' | 'secondarySession') => screen.queryByRole('link', { name: en.FeedPage[key] });

afterEach(cleanup);

describe('FeedCoverBlock Add cover photo', () => {
    it('sits beside the Edit pill, once, on a line of their own', () => {
        renderCover({ corner: pill });
        const edit = screen.getByRole('button', { name: en.FeedEditor.edit });
        expect(addPhoto()?.previousElementSibling).toBe(edit);
        expect(addPhoto()).not.toHaveClass('absolute');
        // Clear of the session buttons, wrapping where the two don't fit.
        expect(addPhoto()?.parentElement).toHaveClass('flex-wrap', 'right-16');
    });

    it('has the whole line without session buttons', () => {
        renderCover({ corner: pill, event: storyEvent({ sessions: [] }) });
        expect(addPhoto()?.parentElement).toHaveClass('right-5');
    });

    it('stays in the corner without the Edit pill', () => {
        renderCover();
        expect(addPhoto()).toHaveClass('absolute', 'top-4', 'left-4');
    });

    it.each([
        ['with a cover photo', { event: storyEvent({ coverMedia: storyPhotos[0] }), corner: pill }],
        [
            'on a theme with art',
            {
                event: storyEvent({
                    theme: { presetKey: 'x', backgroundColor: '#FFFFFF', illustrationUrl: '/a.webp', titleColor: null, headingFont: null },
                }),
                corner: pill,
            },
        ],
        ['to a guest', { isHost: false }],
    ])('is not offered %s', (_, props) => {
        renderCover(props);
        expect(addPhoto()).toBeNull();
    });
});

describe('FeedCoverBlock while editing', () => {
    it('hides Add cover photo and Main session, keeps its place and the other buttons', () => {
        renderCover({ editing: true });
        expect(addPhoto()).toBeNull();
        expect(session('mainSession')).toBeNull();
        expect(session('secondarySession')?.previousElementSibling).toHaveClass('h-9', 'w-9');
        expect(screen.getByRole('link', { name: 'Gifts' })).toBeTruthy();
    });

    it('hides the top button even when it is the secondary session', () => {
        const [, secondary] = storyEvent().sessions ?? [];
        renderCover({ editing: true, event: storyEvent({ sessions: [secondary] }) });
        expect(session('secondarySession')).toBeNull();
    });

    it('draws both outside edit mode', () => {
        renderCover();
        expect(addPhoto()).toBeTruthy();
        expect(session('mainSession')).toBeTruthy();
        expect(session('secondarySession')).toBeTruthy();
    });
});
