import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { get: (...args: unknown[]) => get(...args) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

import { qrCardTemplateKeys, useQrCardHref } from '@/hooks/useQrCardTemplates';
import { routes } from '@/lib/routes';

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    get.mockReset();
});

describe('qrCardTemplateKeys', () => {
    it('keys the list under the event', () => {
        expect(qrCardTemplateKeys.list('e1')).toEqual(['events', 'e1', 'qr-card-templates']);
    });
});

describe('useQrCardHref', () => {
    it('links to the card page once the event has QR cards', async () => {
        get.mockResolvedValue({ available: true, templates: [] });
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        expect(result.current).toBeNull();
        await waitFor(() => expect(result.current).toBe(routes.events.qrCard('e1', 'qr-1')));
        expect(get).toHaveBeenCalledWith('/api/events/e1/qr-card-templates');
    });

    it('keeps the plain print when the event has no QR cards', async () => {
        get.mockResolvedValue({ available: false, templates: [] });
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        await waitFor(() => expect(get).toHaveBeenCalled());
        expect(result.current).toBeNull();
    });

    it('keeps the plain print when the list fails', async () => {
        get.mockRejectedValue(new Error('down'));
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        await waitFor(() => expect(get).toHaveBeenCalled());
        expect(result.current).toBeNull();
    });
});
