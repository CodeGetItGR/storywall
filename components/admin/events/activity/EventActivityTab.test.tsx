import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { weddingActivityFixture } from '@/components/admin/events/activity/__fixtures__/eventActivity';
import { EventActivityTab } from '@/components/admin/events/activity/EventActivityTab';
import { useAdminEventActivity } from '@/hooks/useAdminEvents';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useAdminEvents', () => ({ useAdminEventActivity: vi.fn() }));

// The charts need a measured size; this file only checks the toolbar and the states around them.
vi.mock('@/components/admin/events/activity/EventActivityContent', () => ({ EventActivityContent: () => <div data-testid="activity-content" /> }));

const copy = messages.AdminPage.events.activity;
const mockedQuery = vi.mocked(useAdminEventActivity);

function renderTab(query: Partial<ReturnType<typeof useAdminEventActivity>>) {
    mockedQuery.mockReturnValue({
        refetch: vi.fn(),
        dataUpdatedAt: 0,
        isFetching: false,
        isLoading: false,
        error: null,
        data: undefined,
        ...query,
    } as never);
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <EventActivityTab eventId="event-1" />
        </NextIntlClientProvider>,
    );
}

afterEach(() => {
    cleanup();
    mockedQuery.mockReset();
});

describe('EventActivityTab', () => {
    it('shows the skeleton and no toolbar while loading', () => {
        renderTab({ isLoading: true, isFetching: true });
        expect(screen.getByRole('status', { name: copy.loading })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: copy.refresh })).not.toBeInTheDocument();
        expect(screen.queryByText(/^Updated /)).not.toBeInTheDocument();
    });

    it('shows when the counts were taken once they have loaded', () => {
        renderTab({ data: weddingActivityFixture, dataUpdatedAt: Date.UTC(2026, 5, 16, 11, 2) });
        expect(screen.getByTestId('activity-content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.refresh })).toBeInTheDocument();
        expect(screen.getByText(/^Updated \d{2}:\d{2}$/)).toBeInTheDocument();
    });

    it('shows the error with a refresh button and no content', () => {
        renderTab({ error: new Error('boom') });
        expect(screen.getByRole('button', { name: copy.refresh })).toBeInTheDocument();
        expect(screen.queryByTestId('activity-content')).not.toBeInTheDocument();
        expect(screen.queryByText(/^Updated /)).not.toBeInTheDocument();
    });
});
