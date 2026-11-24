import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestInquiries } from '@/hooks/useGuestInquiries';
import type { GuestInquiryDto } from '@/lib/api/types';

const get = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get, patch },
}));

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: null,
    email: 'maria@example.com',
    note: null,
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useGuestInquiries', () => {
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        get.mockReset();
        patch.mockReset();
    });

    it('reads nothing for a non-partner', () => {
        renderHook(() => useGuestInquiries(false), { wrapper });
        expect(get).not.toHaveBeenCalled();
    });

    it('lists the first page and opens one', async () => {
        get.mockResolvedValue({ content: [ROW], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } });
        const { result } = renderHook(() => useGuestInquiries(true), { wrapper });
        await waitFor(() => expect(result.current.inquiries).toHaveLength(1));

        expect(get).toHaveBeenCalledWith('/api/me/business/inquiries?page=0&size=20');
        expect(result.current.hasMore).toBe(false);
        act(() => result.current.open('q1'));
        expect(result.current.selected?.id).toBe('q1');
    });

    it('marks one done and updates the row in place', async () => {
        get.mockResolvedValue({ content: [ROW], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } });
        patch.mockResolvedValue({ ...ROW, status: 'DONE' });
        const { result } = renderHook(() => useGuestInquiries(true), { wrapper });
        await waitFor(() => expect(result.current.inquiries).toHaveLength(1));
        act(() => result.current.open('q1'));
        await act(() => result.current.setDone(true));

        expect(patch).toHaveBeenCalledWith('/api/me/business/inquiries/q1', { done: true });
        expect(result.current.inquiries[0].status).toBe('DONE');
        expect(result.current.selected?.status).toBe('DONE');
    });
});
