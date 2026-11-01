import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessEventsSection } from '@/components/business/BusinessEventsSection';
import type { BusinessEventDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import messages from '@/messages/en.json';

vi.mock('next/navigation', () => ({ usePathname: () => '/business' }));

const OPEN_EVENT: BusinessEventDto = {
    eventId: 'evt-1',
    title: 'Maria and Nikos',
    startAt: '2026-06-12T15:00:00Z',
    vendorType: 'PHOTOGRAPHER',
    guests: 80,
    views: 1200,
    open: true,
};
const ENDED_EVENT: BusinessEventDto = {
    eventId: 'evt-2',
    title: 'Old wedding',
    startAt: '2025-05-02T15:00:00Z',
    vendorType: 'PHOTOGRAPHER',
    guests: 1,
    open: false,
};

function renderSection(overrides: Partial<ComponentProps<typeof BusinessEventsSection>> = {}) {
    const props = {
        events: [OPEN_EVENT, ENDED_EVENT],
        isLoading: false,
        loadFailed: false,
        hasMore: false,
        isLoadingMore: false,
        onLoadMoreAction: vi.fn(),
        onRetryAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessEventsSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('BusinessEventsSection', () => {
    afterEach(cleanup);

    it('shows a placeholder while loading', () => {
        renderSection({ events: [], isLoading: true });
        expect(screen.queryByText("You haven't joined an event yet.")).not.toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('offers a retry when loading failed', () => {
        const { onRetryAction } = renderSection({ events: [], loadFailed: true });
        expect(screen.getByText("Couldn't load your events.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetryAction).toHaveBeenCalledTimes(1);
    });

    it('says so when there are no events', () => {
        renderSection({ events: [] });
        expect(screen.getByText("You haven't joined an event yet.")).toBeInTheDocument();
    });

    it('shows views only for rows that have them', () => {
        renderSection();
        expect(screen.getByText('1,200 views')).toBeInTheDocument();
        expect(screen.getAllByText(/views?$/)).toHaveLength(1);
        expect(screen.getByText(/80 guests/)).toBeInTheDocument();
        expect(screen.getByText(/1 guest\b/)).toBeInTheDocument();
    });

    it('links an open event to its vendor page', () => {
        renderSection({ events: [OPEN_EVENT] });
        expect(screen.getByRole('link', { name: /Maria and Nikos/ })).toHaveAttribute('href', routes.events.tools.vendorMe('evt-1'));
        expect(screen.queryByText(/Access ended/)).not.toBeInTheDocument();
    });

    it('lists an event whose access ended without a link', () => {
        renderSection({ events: [ENDED_EVENT] });
        expect(screen.getByText('Old wedding')).toBeInTheDocument();
        expect(screen.getByText(/Access ended/)).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('loads more on request and hides the button when there is no more', () => {
        const { onLoadMoreAction } = renderSection({ hasMore: true });
        fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
        expect(onLoadMoreAction).toHaveBeenCalledTimes(1);
        cleanup();
        renderSection({ hasMore: false });
        expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    });
});
