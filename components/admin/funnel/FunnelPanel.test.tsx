import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    emptyFunnelMetricsFixture,
    funnelCohortsFixture,
    funnelMetricsFixture,
    noEndedPaidEventsFixture,
} from '@/components/admin/funnel/__fixtures__/funnelMetrics';
import { FunnelPanel } from '@/components/admin/funnel/FunnelPanel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';
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

function serve(metrics: FunnelMetricsResponseDto) {
    apiGet.mockImplementation((path: string) =>
        Promise.resolve(path.startsWith('/api/admin/metrics/funnel/cohorts') ? funnelCohortsFixture() : metrics),
    );
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <FunnelPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

function expectNoBrokenNumbers(container: HTMLElement) {
    expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
    apiGet.mockReset();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('FunnelPanel', () => {
    it('renders every section from a full response', async () => {
        serve(funnelMetricsFixture());
        const { container } = renderPanel();

        expect(await screen.findByText('Paid hosts')).toBeInTheDocument();
        expect(screen.getByText('15% of 1,240 signups')).toBeInTheDocument();
        for (const title of ['Funnel', 'Where people stall', 'Activity', 'Time to convert', 'Guest to host', 'Weekly cohorts', 'Paid events', 'Revenue', 'Accounts']) {
            expect(screen.getAllByText(title).length).toBeGreaterThan(0);
        }
        // Hours below 48 read as hours, above as days.
        expect(screen.getByText('26.5 h')).toBeInTheDocument();
        expect(screen.getByText('4.5 days')).toBeInTheDocument();
        expect(screen.getByText('€20,800.00')).toBeInTheDocument();
        expectNoBrokenNumbers(container);
    });

    it('shows — instead of NaN when everything is zero or null', async () => {
        serve(emptyFunnelMetricsFixture());
        const { container } = renderPanel();

        expect(await screen.findByText('Paid hosts')).toBeInTheDocument();
        expect(screen.getByText('No payments in this range.')).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
        expect(screen.getByText('— of 0 signups')).toBeInTheDocument();
        expectNoBrokenNumbers(container);
    });

    it('labels the paid-event medians as over ended events', async () => {
        serve(funnelMetricsFixture());
        renderPanel();

        const guests = (await screen.findByText('Median guests')).parentElement!;
        const uploads = screen.getByText('Median uploads').parentElement!;
        expect(within(guests).getByText('42')).toBeInTheDocument();
        expect(within(guests).getByText('Over ended events')).toBeInTheDocument();
        expect(within(uploads).getByText('180.5')).toBeInTheDocument();
        expect(within(uploads).getByText('Over ended events')).toBeInTheDocument();
    });

    it('shows — for the medians when no paid event has ended', async () => {
        serve(noEndedPaidEventsFixture());
        const { container } = renderPanel();

        const guests = (await screen.findByText('Median guests')).parentElement!;
        const uploads = screen.getByText('Median uploads').parentElement!;
        expect(within(guests).getByText('—')).toBeInTheDocument();
        expect(within(uploads).getByText('—')).toBeInTheDocument();
        expectNoBrokenNumbers(container);
    });

    it('gives each currency its own card and never adds them up', async () => {
        const base = funnelMetricsFixture();
        serve(
            funnelMetricsFixture({
                revenue: {
                    ...base.revenue,
                    totals: [
                        { currency: 'EUR', grossMinor: 10_000, refundedMinor: 0, netMinor: 10_000, payingAccounts: 1, netPerPayingAccountMinor: 10_000 },
                        { currency: 'USD', grossMinor: 5_000, refundedMinor: 0, netMinor: 5_000, payingAccounts: 1, netPerPayingAccountMinor: 5_000 },
                    ],
                },
            }),
        );
        renderPanel();

        const eur = await screen.findByTestId('revenue-EUR');
        const usd = screen.getByTestId('revenue-USD');
        expect(within(eur).getAllByText('€100.00').length).toBeGreaterThan(0);
        expect(eur.textContent).not.toContain('$');
        expect(within(usd).getAllByText('$50.00').length).toBeGreaterThan(0);
        expect(usd.textContent).not.toContain('€');
        // 100 + 50 in any currency would mean a cross-currency sum.
        expect(document.body.textContent).not.toMatch(/150\.00/);
    });

    it('shows a negative first-event-to-paid median as it is', async () => {
        const base = funnelMetricsFixture();
        serve(funnelMetricsFixture({ timeToConvert: { ...base.timeToConvert, medianHoursFirstEventToPaid: -5 } }));
        renderPanel();

        expect(await screen.findByText('-5.0 h')).toBeInTheDocument();
    });

    it('sends the admin’s exclusive next-day local midnight as until', async () => {
        const originalTz = process.env.TZ;
        process.env.TZ = 'Europe/Athens';
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-30T15:00:00Z'));
        serve(funnelMetricsFixture());
        renderPanel();

        await screen.findByText('Paid hosts');
        expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/funnel');

        fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
        await waitFor(() =>
            expect(apiGet).toHaveBeenCalledWith(
                '/api/admin/metrics/funnel?since=2026-09-01T00%3A00%3A00%2B03%3A00&until=2026-10-01T00%3A00%3A00%2B03%3A00',
            ),
        );
        process.env.TZ = originalTz;
    });
});
