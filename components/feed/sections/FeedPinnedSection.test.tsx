import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import { FeedPinnedSection } from '@/components/feed/sections/FeedPinnedSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { InvitationSection } from '@/lib/invitation/sections';
import en from '@/messages/en.json';

const embla = vi.hoisted(() => ({
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canScrollPrev: () => true,
    canScrollNext: () => true,
    on: vi.fn(),
    off: vi.fn(),
    selectedScrollSnap: () => 1,
}));

// Embla measures real layout, which the test DOM doesn't have.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), embla] }));

afterEach(cleanup);

const photos = [
    { id: 'a', image: { source: 'media' as const, mediaId: 'img-a' } },
    { id: 'b', image: { source: 'media' as const, mediaId: 'img-b' } },
];
const media = (id: string) => (id === 'img-a' ? 'https://r2/a.jpg' : id === 'img-b' ? 'https://r2/b.jpg' : undefined);

function renderWithCopy(node: ReactNode) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

function renderPinned(list = photos, placeholder?: ReactNode) {
    renderWithCopy(<FeedPinnedSection photos={list} media={media} placeholder={placeholder} />);
}

describe('FeedPinnedSection', () => {
    it('draws each photo in order, each with its alt text', () => {
        renderPinned();
        const images = screen.getAllByRole('img');
        expect(images.map((image) => image.getAttribute('alt'))).toEqual(['Photo 1 of 2', 'Photo 2 of 2']);
        expect(images[0].getAttribute('src')).toContain('a.jpg');
    });

    it('leaves out a photo with no URL', () => {
        renderPinned([...photos, { id: 'c', image: { source: 'media', mediaId: 'img-gone' } }]);
        expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    it('opens a photo full size on tap, in the post photo viewer', () => {
        const onOpen = vi.fn();
        renderWithCopy(<FeedPinnedSection photos={photos} media={media} onOpen={onOpen} />);
        fireEvent.click(screen.getByRole('button', { name: 'Photo 2 of 2' }));
        expect(onOpen).toHaveBeenCalledWith(1);
    });

    it('draws nothing with no photos, or the placeholder in edit mode', () => {
        renderPinned([]);
        expect(screen.queryByRole('img')).toBeNull();
        cleanup();
        renderPinned([], <span>empty</span>);
        expect(screen.getByText('empty')).toBeTruthy();
    });
});

describe('Pinned photos as a feed section', () => {
    const event = { id: 'e-1' } as unknown as EventDetailResponseDto;
    const section = { id: 'pp', type: 'feedPinned', data: { photos } } as unknown as InvitationSection;

    it('opens the tapped photo full screen on the member page, and closes it', async () => {
        renderWithCopy(<FeedModeSection event={event} section={section} media={media} opensPhotos />);
        fireEvent.click(screen.getByRole('button', { name: 'Photo 2 of 2' }));
        const viewer = screen.getByRole('dialog', { name: 'Photo 2 of 2' });
        expect(viewer.textContent).toContain('2 / 2');
        fireEvent.click(screen.getByRole('button', { name: en.PostModal.close }));
        await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('takes no taps in edit mode', () => {
        renderWithCopy(<FeedModeSection event={event} section={section} media={media} />);
        expect(screen.getAllByRole('img')).toHaveLength(2);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
