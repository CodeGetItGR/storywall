import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ApiError } from '@/lib/api/client';
import type { VendorMeDto } from '@/lib/api/types';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const ctx = vi.hoisted(() => ({ isHost: false, loading: false }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'e1' }),
    useIsHost: () => ctx.isHost,
    useEventContextLoading: () => ctx.loading,
}));

const apiGet = vi.fn();
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: (...args: unknown[]) => apiGet(...args) },
}));

function vendor(overrides: Partial<VendorMeDto> = {}): VendorMeDto {
    return {
        vendorId: 'v1',
        vendorType: 'PLANNER',
        capabilities: ['QR_READ'],
        accessEndsAt: null,
        accessOpen: true,
        profileComplete: true,
        showPartnerPrompt: false,
        proStorageBytes: null,
        proUsedBytes: null,
        optedOut: false,
        hiddenByHost: false,
        toolsOff: null,
        approvedPartner: false,
        sneakPeek: null,
        ...overrides,
    };
}

beforeEach(() => {
    replace.mockReset();
    apiGet.mockReset();
    ctx.isHost = false;
    ctx.loading = false;
});
afterEach(cleanup);

function renderGate(props: { allowVendorCapability?: 'QR_READ'; requireHost?: boolean } = { allowVendorCapability: 'QR_READ' }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <EventRouteGate requireHost={props.requireHost ?? true} allowVendorCapability={props.allowVendorCapability} fallback={<p>loading</p>}>
                <p>screen</p>
            </EventRouteGate>
        </QueryClientProvider>,
    );
}

describe('EventRouteGate with allowVendorCapability', () => {
    it('lets a vendor with the capability in', async () => {
        apiGet.mockResolvedValue(vendor());
        renderGate();
        expect(await screen.findByText('screen')).toBeTruthy();
        expect(replace).not.toHaveBeenCalled();
    });

    it('shows the loading state while the vendor role loads', () => {
        apiGet.mockReturnValue(new Promise(() => {}));
        renderGate();
        expect(screen.getByText('loading')).toBeTruthy();
        expect(screen.queryByText('screen')).toBeNull();
        expect(replace).not.toHaveBeenCalled();
    });

    it('sends a vendor without the capability to the feed', async () => {
        apiGet.mockResolvedValue(vendor({ capabilities: ['SONG_REQUESTS'] }));
        renderGate();
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/e1/feed'));
        expect(screen.queryByText('screen')).toBeNull();
        expect(screen.getByText('loading')).toBeTruthy();
    });

    it('sends a vendor whose access ended to the feed', async () => {
        apiGet.mockResolvedValue(vendor({ accessOpen: false, capabilities: [], toolsOff: 'ACCESS_ENDED' }));
        renderGate();
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/e1/feed'));
        expect(screen.queryByText('screen')).toBeNull();
    });

    it('sends a vendor whose tools are off to the feed', async () => {
        apiGet.mockResolvedValue(vendor({ capabilities: [], toolsOff: 'MODULE_OFF' }));
        renderGate();
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/e1/feed'));
        expect(screen.queryByText('screen')).toBeNull();
    });

    it('sends a non-vendor to the feed', async () => {
        apiGet.mockRejectedValue(new ApiError(404, 'Not found'));
        renderGate();
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/e1/feed'));
        expect(screen.queryByText('screen')).toBeNull();
    });

    it('lets a host in without asking about vendors', () => {
        ctx.isHost = true;
        renderGate();
        expect(screen.getByText('screen')).toBeTruthy();
        expect(apiGet).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
    });

    it('keeps waiting for the event context before asking about vendors', () => {
        ctx.loading = true;
        apiGet.mockResolvedValue(vendor());
        renderGate();
        expect(screen.getByText('loading')).toBeTruthy();
        expect(replace).not.toHaveBeenCalled();
    });
});

describe('EventRouteGate without allowVendorCapability', () => {
    it('still sends a non-host to the feed without asking about vendors', async () => {
        renderGate({ requireHost: true });
        await waitFor(() => expect(replace).toHaveBeenCalledWith('/events/e1/feed'));
        expect(apiGet).not.toHaveBeenCalled();
        expect(screen.queryByText('screen')).toBeNull();
    });

    it('still lets a member in when the host is not required', () => {
        renderGate({ requireHost: false });
        expect(screen.getByText('screen')).toBeTruthy();
        expect(apiGet).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
    });

    it('still lets a host in', () => {
        ctx.isHost = true;
        renderGate({ requireHost: true });
        expect(screen.getByText('screen')).toBeTruthy();
        expect(apiGet).not.toHaveBeenCalled();
    });
});
