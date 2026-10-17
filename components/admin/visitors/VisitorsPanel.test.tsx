import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    emptyVisitorMetricsFixture,
    notConfiguredVisitorMetricsFixture,
    visitorMetricsFixture,
} from '@/components/admin/visitors/__fixtures__/visitorMetrics';
import { VisitorsPanel } from '@/components/admin/visitors/VisitorsPanel';
import messages from '@/messages/en.json';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <VisitorsPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('VisitorsPanel', () => {
    it('renders every block from a full response', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        const { container } = renderPanel();

        expect(await screen.findByText('2,400')).toBeInTheDocument();
        expect(screen.getByText('1,800', { selector: 'p' })).toBeInTheDocument();
        // 36 sign-ups over 2,400 visits.
        expect(screen.getByText('1.5')).toBeInTheDocument();
        for (const title of ['Totals', 'Visitors over time', 'By source', 'Pages', 'Landing page']) {
            expect(screen.getAllByText(title).length).toBeGreaterThan(0);
        }
        expect(screen.getByText('/el/gamos')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
        expect(screen.getByText('Greek')).toBeInTheDocument();
        expect(screen.getByText('how_it_works')).toBeInTheDocument();
        expect(screen.getByText('Question 2')).toBeInTheDocument();
        expect(screen.getByText(/^Updated /)).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    it('tags a source with few visits and shows no rate for it', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        renderPanel();

        const table = await screen.findByRole('table', { name: 'By source' });
        const social = within(table).getByText('Social').closest('tr') as HTMLElement;
        expect(within(social).getByText('Few visits')).toBeInTheDocument();
        expect(within(social).getByText('—')).toBeInTheDocument();
        const invite = within(table).getByText('Invite').closest('tr') as HTMLElement;
        expect(within(invite).queryByText('Few visits')).not.toBeInTheDocument();
    });

    it('says when Google Analytics is not connected', async () => {
        apiGet.mockResolvedValue(notConfiguredVisitorMetricsFixture());
        renderPanel();

        expect(await screen.findByText("Google Analytics isn't connected.")).toBeInTheDocument();
        expect(screen.queryByText('Totals')).not.toBeInTheDocument();
    });

    it('shows No data yet for every empty list', async () => {
        apiGet.mockResolvedValue(emptyVisitorMetricsFixture());
        renderPanel();

        expect(await screen.findByText('Totals')).toBeInTheDocument();
        // Daily line, sources, pages, and the four landing lists.
        expect(screen.getAllByText('No data yet')).toHaveLength(7);
    });

    it('offers Retry after an error and asks GA again', async () => {
        apiGet.mockRejectedValueOnce(new Error('503')).mockResolvedValue(visitorMetricsFixture());
        renderPanel();

        fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

        expect(await screen.findByText('2,400')).toBeInTheDocument();
        expect(apiGet).toHaveBeenLastCalledWith('/api/admin/metrics/visitors?fresh=true');
        expect(screen.queryByText("Couldn't load visitor numbers.")).not.toBeInTheDocument();
    });

    it('asks GA again on Refresh', async () => {
        apiGet.mockResolvedValue(visitorMetricsFixture());
        renderPanel();
        await screen.findByText('2,400');

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => expect(apiGet).toHaveBeenLastCalledWith('/api/admin/metrics/visitors?fresh=true'));
    });

    it('clears a failed Refresh when the range changes', async () => {
        apiGet.mockImplementation((url: string) =>
            url.includes('fresh=true') ? Promise.reject(new Error('503')) : Promise.resolve(visitorMetricsFixture()),
        );
        renderPanel();
        await screen.findByText('2,400');

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        expect(await screen.findByText("Couldn't load visitor numbers.")).toBeInTheDocument();

        fireEvent.click(within(screen.getByRole('group', { name: 'Date range' })).getByRole('button', { name: 'Last 30 days' }));

        await waitFor(() => expect(screen.queryByText("Couldn't load visitor numbers.")).not.toBeInTheDocument());
        expect(await screen.findByText('2,400')).toBeInTheDocument();
    });
});
