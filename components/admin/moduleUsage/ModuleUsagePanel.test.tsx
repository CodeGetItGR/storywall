import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { moduleUsageFixture, tooFewModuleUsageFixture } from '@/components/admin/moduleUsage/__fixtures__/moduleUsage';
import { ModuleUsagePanel } from '@/components/admin/moduleUsage/ModuleUsagePanel';
import type { ModuleUsageResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

function serve(usage: ModuleUsageResponseDto) {
    apiGet.mockImplementation((path: string) => {
        if (path.startsWith('/api/admin/metrics/module-usage')) return Promise.resolve(usage);
        if (path.startsWith('/api/admin/plan-tiers')) return Promise.resolve([{ id: 'p1', code: 'PLUS', name: 'Plus' }]);
        return Promise.resolve([{ id: 't1', eventTypeKey: 'WEDDING', name: { en: 'Wedding' } }]);
    });
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <ModuleUsagePanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    apiGet.mockReset();
});
afterEach(cleanup);

describe('ModuleUsagePanel', () => {
    it('renders modules, metrics and hidden small groups', async () => {
        serve(moduleUsageFixture());
        const { container } = renderPanel();

        expect(await screen.findByText('Posts per event')).toBeInTheDocument();
        expect(screen.getByText('Bank details')).toBeInTheDocument();
        expect(screen.getByText('Events with a comment')).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(screen.getByText('Too few events')).toBeInTheDocument();
        expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    it('says when too few events match overall', async () => {
        serve(tooFewModuleUsageFixture());
        renderPanel();

        expect(await screen.findByText('Fewer than 5 events match. Widen the range or filters.')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('sends the event type and plan filters', async () => {
        serve(moduleUsageFixture());
        renderPanel();
        await screen.findByText('Posts per event');

        await screen.findByRole('option', { name: 'Wedding' });
        fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'WEDDING' } });
        await screen.findByRole('option', { name: 'Plus' });
        fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'PLUS' } });

        await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/api/admin/metrics/module-usage?eventTypeKey=WEDDING&planCode=PLUS'));
    });
});
