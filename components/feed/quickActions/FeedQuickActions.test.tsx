import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedQuickAction } from '@/hooks/useFeedQuickActions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { VendorActionKey } from '@/lib/vendors';

import { FeedQuickActions } from './FeedQuickActions';

const mocks = vi.hoisted(() => ({
    actions: [] as FeedQuickAction[],
    vendorActions: [] as { key: VendorActionKey; href: string }[],
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useFeedQuickActions', () => ({ useFeedQuickActions: () => mocks.actions }));
vi.mock('@/hooks/useVendorQuickActions', () => ({ useVendorQuickActions: () => mocks.vendorActions }));

const event = { id: 'e1' } as EventDetailResponseDto;

vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
    },
);

describe('FeedQuickActions', () => {
    beforeEach(() => {
        mocks.actions = [
            { key: 'photos', label: 'Photos', href: '/q/up?choice=upload' },
            { key: 'wishbook', label: 'Wishbook', href: '/events/e1/tools/wishbook' },
        ];
        mocks.vendorActions = [];
    });
    afterEach(cleanup);

    it('spreads a guest row evenly with no scrolling', () => {
        render(<FeedQuickActions event={event} isHost={false} />);

        const list = screen.getByRole('list');
        expect(list).toHaveClass('justify-evenly');
        expect(list).not.toHaveClass('overflow-x-auto');
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Photos', 'Wishbook']);
    });

    it("puts a vendor's tools first in one sideways-scrolling row", () => {
        mocks.vendorActions = [
            { key: 'schedule', href: '/events/e1/schedule' },
            { key: 'announcement', href: '/events/e1/announce' },
            { key: 'rsvpReport', href: '/events/e1/rsvp' },
        ];
        render(<FeedQuickActions event={event} isHost={false} />);

        expect(screen.getByRole('list')).toHaveClass('overflow-x-auto');
        expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
            'quickActions.schedule',
            'quickActions.announcement',
            'rsvpReport',
            'Photos',
            'Wishbook',
        ]);
    });

    it('shows nothing when there is no action', () => {
        mocks.actions = [];
        const { container } = render(<FeedQuickActions event={event} isHost={false} />);

        expect(container).toBeEmptyDOMElement();
    });
});
