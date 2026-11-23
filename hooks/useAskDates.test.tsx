import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAskDates } from '@/hooks/useAskDates';
import { eventKeys } from '@/hooks/useEvent';
import { vendorKeys } from '@/hooks/useVendors';
import { ApiError } from '@/lib/api/client';
import type { VendorRowDto } from '@/lib/api/types';
import { inquiryDateBounds } from '@/lib/inquiries';
import messages from '@/messages/en.json';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'maria@example.com' } }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

const { min } = inquiryDateBounds();

describe('useAskDates', () => {
    beforeEach(() => {
        client = new QueryClient();
        post.mockReset();
    });

    it('opens with the account email filled in and nothing else', () => {
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => result.current.openForVendor('v1', 'Lens & Light'));

        expect(result.current.target).toEqual({ kind: 'vendor', vendorId: 'v1', name: 'Lens & Light' });
        expect(result.current.email).toBe('maria@example.com');
        expect(result.current.date).toBe('');
        expect(result.current.consent).toBe(false);
        expect(result.current.canSend).toBe(false);
    });

    it('asks for a date and a way to reach the guest before sending', async () => {
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setEmail('');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post).not.toHaveBeenCalled();
        expect(result.current.dateError).toBe('Pick a date.');
        expect(result.current.contactError).toBe('Add a phone or an email.');
    });

    it('sends to the vendor route and closes the ask in the vendor list', async () => {
        client.setQueryData<VendorRowDto[]>(vendorKeys.list('evt-1'), [
            { id: 'v1', inquiry: { canAsk: true, sentAt: null } } as VendorRowDto,
        ]);
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setDate(min);
            result.current.setNote('  Summer wedding  ');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post).toHaveBeenCalledWith('/api/events/evt-1/vendors/v1/inquiries', {
            eventDate: min,
            email: 'maria@example.com',
            note: 'Summer wedding',
            consent: true,
        });
        expect(result.current.sent).toBe(true);
        expect(client.getQueryData<VendorRowDto[]>(vendorKeys.list('evt-1'))?.[0].inquiry).toEqual({
            canAsk: false,
            sentAt: '2026-11-23T10:00:00Z',
        });
    });

    it('sends to the feed card route', async () => {
        client.setQueryData(eventKeys.detail('evt-1'), { partnerBranding: { inquiry: { canAsk: true, sentAt: null } } });
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForCard('Aegean Weddings');
            result.current.setDate(min);
            result.current.setPhone('+30 690 000 0000');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post.mock.calls[0][0]).toBe('/api/events/evt-1/partner-branding/inquiries');
        expect(post.mock.calls[0][1].phone).toBe('+30 690 000 0000');
    });

    it('shows the server error in the sheet', async () => {
        post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5228, detail: 'already' }));
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setDate(min);
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(result.current.sent).toBe(false);
        expect(result.current.sendError).toBe('You already asked them.');
    });

    function fill(result: { current: ReturnType<typeof useAskDates> }, kind: 'vendor' | 'card') {
        act(() => {
            if (kind === 'vendor') result.current.openForVendor('v1', 'Lens & Light');
            else result.current.openForCard('Aegean Weddings');
            result.current.setDate(min);
            result.current.setConsent(true);
        });
    }

    function seedOther() {
        client.setQueryData(['events', 'evt-1', 'posts'], []);
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        return invalidate;
    }

    it('refreshes the feed card after a send from a vendor row', async () => {
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const invalidate = seedOther();
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        fill(result, 'vendor');
        await act(() => result.current.submit());

        expect(invalidate).toHaveBeenCalledWith({ queryKey: eventKeys.detail('evt-1'), exact: true });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: vendorKeys.list('evt-1') });
        expect(client.getQueryState(['events', 'evt-1', 'posts'])?.isInvalidated).toBe(false);
    });

    it('refreshes the vendor list after a send from the feed card', async () => {
        client.setQueryData(eventKeys.detail('evt-1'), { partnerBranding: { inquiry: { canAsk: true, sentAt: null } } });
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const invalidate = seedOther();
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        fill(result, 'card');
        await act(() => result.current.submit());

        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('evt-1') });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: eventKeys.detail('evt-1'), exact: true });
    });

    it('refreshes both surfaces when the partner was already asked', async () => {
        post.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5228, detail: 'already' }));
        const invalidate = seedOther();
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        fill(result, 'vendor');
        await act(() => result.current.submit());

        expect(result.current.sendError).toBe('You already asked them.');
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('evt-1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: eventKeys.detail('evt-1'), exact: true });
        expect(client.getQueryState(['events', 'evt-1', 'posts'])?.isInvalidated).toBe(false);
    });

    it('refreshes both surfaces when the partner is gone', async () => {
        post.mockRejectedValue(new ApiError(404, { status: 404, detail: 'gone' }));
        const invalidate = seedOther();
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        fill(result, 'card');
        await act(() => result.current.submit());

        expect(result.current.sendError).not.toBeNull();
        expect(invalidate).toHaveBeenCalledWith({ queryKey: vendorKeys.list('evt-1') });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: eventKeys.detail('evt-1'), exact: true });
    });

    it('leaves the caches alone on other errors', async () => {
        post.mockRejectedValue(new ApiError(500, { status: 500, detail: 'boom' }));
        const invalidate = seedOther();
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        fill(result, 'vendor');
        await act(() => result.current.submit());

        expect(invalidate).not.toHaveBeenCalled();
    });
});
