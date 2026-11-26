import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyEvent, storyPhotos } from '@/.storybook/fixtures';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import en from '@/messages/en.json';

vi.mock('@/hooks/useFeedCoverBlock', () => ({
    useFeedCoverBlock: () => ({ pageLoaded: false, onIllustrationError: vi.fn(), giftHref: '/gifts', giftName: 'Gifts' }),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));

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
    it('sits in the corner', () => {
        renderCover();
        expect(addPhoto()).toHaveClass('absolute', 'top-4', 'left-4');
    });

    it.each([
        ['with a cover photo', { event: storyEvent({ coverMedia: storyPhotos[0] }) }],
        [
            'on a theme with art',
            {
                event: storyEvent({
                    theme: { presetKey: 'x', backgroundColor: '#FFFFFF', illustrationUrl: '/a.webp', titleColor: null, headingFont: null },
                }),
            },
        ],
        ['to a guest', { isHost: false }],
    ])('is not offered %s', (_, props) => {
        renderCover(props);
        expect(addPhoto()).toBeNull();
    });
});

describe('FeedCoverBlock while editing', () => {
    it('draws no buttons: no photo, session or gift', () => {
        renderCover({ editing: true });
        expect(screen.queryAllByRole('link')).toEqual([]);
        expect(screen.queryAllByRole('button')).toEqual([]);
    });

    it('draws them all outside edit mode', () => {
        renderCover();
        expect(addPhoto()).toBeTruthy();
        expect(session('mainSession')).toBeTruthy();
        expect(session('secondarySession')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Gifts' })).toBeTruthy();
    });
});
