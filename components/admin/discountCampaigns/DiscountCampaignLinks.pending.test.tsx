import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignLinks } from '@/components/admin/discountCampaigns/DiscountCampaignLinks';
import { api } from '@/lib/api/client';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

// The real mutation, with a request that stays open until the test finishes it. Two requests at the
// same moment would leave the right links, but the server answers the second with a 409.
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: vi.fn(), post: vi.fn() },
}));

const campaign = { id: 'c1', name: 'Black Friday', linkName: 'bf' } as AdminDiscountCampaignDto;

function renderLinks() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
                <DiscountCampaignLinks campaign={campaign} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

describe('DiscountCampaignLinks while a set is being created', () => {
    let finish: (value: unknown) => void = () => undefined;

    beforeEach(() => {
        vi.mocked(api.get).mockResolvedValue([]);
        vi.mocked(api.post).mockReset();
        vi.mocked(api.post).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    });

    afterEach(cleanup);

    it('sends one request for quick clicks, then lets the button work again', async () => {
        renderLinks();

        const create = await screen.findByRole('button', { name: 'Greek links' });
        fireEvent.click(create);
        fireEvent.click(create);

        await waitFor(() => expect(screen.getByRole('button', { name: 'Greek links' })).toBeDisabled());
        expect(api.post).toHaveBeenCalledTimes(1);

        await act(async () => finish({ links: [], created: 9 }));

        await waitFor(() => expect(screen.getByRole('button', { name: 'Greek links' })).toBeEnabled());
    });
});
