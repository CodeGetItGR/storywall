import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VendorMessagesPanel } from '@/components/admin/vendorMessages/VendorMessagesPanel';
import type { VendorContactMessageDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: {
        get: (...args: unknown[]) => mocks.get(...args),
        patch: (...args: unknown[]) => mocks.patch(...args),
    },
}));

const copy = messages.AdminPage.vendorMessagesPanel;

function message(overrides: Partial<VendorContactMessageDto> = {}): VendorContactMessageDto {
    return {
        id: 'm-1',
        userId: 'u-1',
        businessName: 'Lens & Light',
        replyEmail: 'studio@example.com',
        emailVerified: true,
        topic: 'QUESTION',
        message: 'How do prints work?\nSecond line.',
        status: 'NEW',
        createdAt: '2026-10-30T10:00:00Z',
        ...overrides,
    };
}

function pageOf(content: VendorContactMessageDto[], totalPages = 1) {
    return { content, page: { size: 50, number: 0, totalElements: content.length, totalPages } };
}

function renderPanel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages}>
                <VendorMessagesPanel />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

async function openFirstMessage() {
    fireEvent.click(await screen.findByRole('button', { name: copy.open }));
    return screen.findByRole('dialog');
}

beforeEach(() => {
    mocks.get.mockReset();
    mocks.patch.mockReset();
});

afterEach(cleanup);

describe('VendorMessagesPanel', () => {
    it('lists new messages first, and a filter change goes back to the first page', async () => {
        mocks.get.mockResolvedValue({ content: [message()], page: { size: 50, number: 0, totalElements: 60, totalPages: 2 } });
        renderPanel();

        await screen.findByText('How do prints work?');
        expect(mocks.get).toHaveBeenLastCalledWith('/api/admin/vendor-messages?status=NEW&page=0&size=50');

        fireEvent.click(screen.getByRole('button', { name: messages.AdminPage.accounts.next }));
        await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/api/admin/vendor-messages?status=NEW&page=1&size=50'));

        fireEvent.click(screen.getByRole('button', { name: copy.filters.ANSWERED }));
        await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/api/admin/vendor-messages?status=ANSWERED&page=0&size=50'));

        fireEvent.click(screen.getByRole('button', { name: copy.filters.ALL }));
        await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/api/admin/vendor-messages?page=0&size=50'));
    });

    it('opens a message in the drawer and closes it', async () => {
        mocks.get.mockResolvedValue(pageOf([message()]));
        renderPanel();

        const drawer = await openFirstMessage();
        expect(within(drawer).getByText(/Second line\./)).toBeInTheDocument();
        const reply = within(drawer).getByRole('link', { name: copy.reply });
        expect(reply).toHaveAttribute('href', 'mailto:studio%40example.com?subject=StoryWall');

        // The footer's Close, next to the header's ×.
        fireEvent.click(within(drawer).getAllByRole('button', { name: copy.close }).at(-1)!);
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('marks a message answered and shows the new status in the drawer', async () => {
        mocks.get.mockResolvedValue(pageOf([message()]));
        mocks.patch.mockResolvedValue(message({ status: 'ANSWERED', answeredAt: '2026-10-31T09:00:00Z' }));
        renderPanel();

        const drawer = await openFirstMessage();
        fireEvent.click(within(drawer).getByRole('button', { name: copy.markAnswered }));

        expect(await within(drawer).findByRole('button', { name: copy.markNew })).toBeInTheDocument();
        expect(mocks.patch).toHaveBeenCalledWith('/api/admin/vendor-messages/m-1', { status: 'ANSWERED' });
    });

    it('shows an error when the status change fails', async () => {
        mocks.get.mockResolvedValue(pageOf([message()]));
        mocks.patch.mockRejectedValue(new Error('boom'));
        renderPanel();

        const drawer = await openFirstMessage();
        fireEvent.click(within(drawer).getByRole('button', { name: copy.markAnswered }));

        expect(await within(drawer).findByText(messages.ApiErrors.generic)).toBeInTheDocument();
        expect(within(drawer).getByRole('button', { name: copy.markAnswered })).toBeInTheDocument();
    });

    it('marks an unverified reply address', async () => {
        mocks.get.mockResolvedValue(pageOf([message({ emailVerified: false })]));
        renderPanel();

        const drawer = await openFirstMessage();
        expect(within(drawer).getByText(copy.notVerified)).toBeInTheDocument();
    });

    it('leaves a verified reply address unmarked', async () => {
        mocks.get.mockResolvedValue(pageOf([message()]));
        renderPanel();

        const drawer = await openFirstMessage();
        expect(within(drawer).queryByText(copy.notVerified)).not.toBeInTheDocument();
    });
});
