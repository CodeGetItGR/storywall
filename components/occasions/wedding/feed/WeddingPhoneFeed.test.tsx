import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type Messages } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingPhoneFeed } from '@/components/occasions/wedding/feed/WeddingPhoneFeed';
import type { WeddingHeroFeedCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_HERO_MEDIA } from '@/lib/occasions/weddingMedia';
import el from '@/messages/el.json';

const t = createTranslator({ locale: 'el', messages: el as Messages, namespace: 'OccasionPages.WEDDING' });
const copy = t.raw('hero.feed') as WeddingHeroFeedCopy;
const mock = t.raw('mock') as WeddingMockCopy;

function renderFeed() {
    return render(<WeddingPhoneFeed copy={copy} media={WEDDING_HERO_MEDIA} mock={mock} />);
}

afterEach(cleanup);

describe('WeddingPhoneFeed', () => {
    it('draws the cover, the countdown and every post from the copy', () => {
        renderFeed();
        expect(screen.getByText('James & Olivia')).toBeInTheDocument();
        expect(screen.getByText('116')).toBeInTheDocument();
        expect(screen.getByText('Λ')).toBeInTheDocument();
        expect(screen.getByText('Η ιστορία σας')).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(9);
        for (const post of copy.posts) expect(screen.getByText(post.caption)).toBeInTheDocument();
    });

    it('puts the playlist card between posts 6 and 7', () => {
        renderFeed();
        const music = screen.getByText(copy.music.title);
        const [sixth, seventh] = screen.getAllByRole('article').slice(5, 7);
        expect(sixth!.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(seventh!.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('shows two photos side by side on a two-photo post', () => {
        renderFeed();
        const second = screen.getAllByRole('article')[1]!;
        expect(second.querySelectorAll('img[class*="aspect-[3/4]"]')).toHaveLength(2);
    });

    it('loads every photo at once, after the page text', () => {
        const { container } = renderFeed();
        const photos = [...container.querySelectorAll('img')].filter((image) => !image.getAttribute('src')?.endsWith('.svg'));
        expect(photos.length).toBeGreaterThan(30);
        for (const photo of photos) {
            expect(photo).toHaveAttribute('loading', 'eager');
            expect(photo).toHaveAttribute('fetchpriority', 'low');
        }
    });
});
