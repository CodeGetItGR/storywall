import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MyWishesSection } from '@/components/wishbook/MyWishesSection';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

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
});
