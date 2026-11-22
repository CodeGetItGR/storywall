import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MyWishesSection } from '@/components/wishbook/MyWishesSection';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useLocale: () => 'el', useTranslations: () => (key: string) => key }));

const entry: WishbookEntryResponseDto = {
    id: 'w1',
    eventId: 'e1',
    authorMemberId: 'm1',
    guestName: 'Me',
    message: 'Wishing you every happiness',
    createdAt: '2026-11-16T10:00:00Z',
    audio: null,
    canDelete: true,
    highlighted: null,
};

const voiceOnly: WishbookEntryResponseDto = {
    ...entry,
    id: 'w2',
    message: null,
    audio: { url: 'https://r2.test/a.m4a', durationMs: 42_000 },
};

const base = { entries: [entry], isLoading: false, hasNextPage: false, isFetchingNextPage: false, onLoadMore: vi.fn(), canEdit: true };

afterEach(cleanup);

describe('MyWishesSection', () => {
    it('lists the guest’s own wishes under its title', () => {
        render(<MyWishesSection {...base} onSelect={vi.fn()} />);

        expect(screen.getByRole('heading', { name: 'myWishesTitle' })).toBeTruthy();
        expect(screen.getByText('Wishing you every happiness')).toBeTruthy();
    });

    it('opens a wish for editing', () => {
        const onSelect = vi.fn();
        render(<MyWishesSection {...base} onSelect={onSelect} />);

        fireEvent.click(screen.getByRole('button', { name: /edit/ }));

        expect(onSelect).toHaveBeenCalledWith(entry);
    });

    it('shows the wishes without an edit button when the event no longer takes changes', () => {
        render(<MyWishesSection {...base} canEdit={false} onSelect={vi.fn()} />);

        expect(screen.getByText('Wishing you every happiness')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /edit/ })).toBeNull();
    });

    it('shows a voice wish as a mic and its length on an editable row', () => {
        render(<MyWishesSection {...base} entries={[voiceOnly]} onSelect={vi.fn()} />);

        expect(screen.getByText('0:42')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'play' })).toBeNull();
        expect(screen.getByRole('button', { name: /edit/ })).toBeTruthy();
    });

    it('plays a voice wish on a read-only row', () => {
        render(<MyWishesSection {...base} canEdit={false} entries={[voiceOnly]} onSelect={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'play' })).toBeTruthy();
    });

    it('draws no empty text line for a voice-only wish', () => {
        const { container } = render(<MyWishesSection {...base} entries={[voiceOnly]} onSelect={vi.fn()} />);

        expect(container.querySelectorAll('.line-clamp-2')).toHaveLength(0);
    });

    it('renders nothing when the guest has no wishes', () => {
        const { container } = render(<MyWishesSection {...base} entries={[]} onSelect={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('loads more', () => {
        const onLoadMore = vi.fn();
        render(<MyWishesSection {...base} hasNextPage onLoadMore={onLoadMore} onSelect={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'loadMore' }));

        expect(onLoadMore).toHaveBeenCalled();
    });

    it('shows a wish’s date in the app’s language', () => {
        const { container } = render(<MyWishesSection {...base} onSelect={vi.fn()} />);

        const time = container.querySelector('time');
        expect(time?.textContent).toBe(new Intl.DateTimeFormat('el', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt)));
        expect(time?.textContent).toMatch(/Νοε/);
    });
});
