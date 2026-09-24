import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { useExtensionCheckoutReview } from '@/hooks/useExtensionCheckoutReview';
import type { ExtensionOptionResponseDto } from '@/lib/api/types';

// Hoisted above the imports, so the API client reads it when it loads.
const API = vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    return 'http://api.test';
});

const mocks = vi.hoisted(() => ({ navigateToCheckout: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: mocks.navigateToCheckout,
}));

const option: ExtensionOptionResponseDto = {
    coverageOptionId: 'ext-3',
    months: 3,
    amountMinor: 1500,
    currency: 'EUR',
    resultingCoverageEndsAt: '2027-12-20T21:00:00Z',
    breakdown: {} as ExtensionOptionResponseDto['breakdown'],
};

const server = setupServer();
let checkoutBodies: unknown[] = [];
let optionsCalls = 0;

function problem(status: number, errorCode: number) {
    return HttpResponse.json({ status, errorCode, title: 'error' }, { status, headers: { 'Content-Type': 'application/problem+json' } });
}

function serveExtension(checkoutResponse: () => Response) {
    server.use(
        http.get(`${API}/api/config`, () => HttpResponse.json({ withdrawal: { termsVersion: 'terms-from-config' } })),
        http.get(`${API}/api/events/event-1/extension-options`, () => {
            optionsCalls += 1;
            return HttpResponse.json([option]);
        }),
        http.post(`${API}/api/events/event-1/extension-checkout`, async ({ request }) => {
            checkoutBodies.push(await request.json());
            return checkoutResponse();
        }),
    );
}

function renderReview() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return { queryClient, ...renderHook(() => useExtensionCheckoutReview('event-1', 'ext-3', true), { wrapper }) };
}

async function renderLoaded() {
    const view = renderReview();
    await waitFor(() => expect(view.result.current.option).not.toBeNull());
    // The terms version arrives from /api/config on its own request.
    await waitFor(() => expect(view.queryClient.getQueryData(appConfigKeys.all)).toBeDefined());
    return view;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
    checkoutBodies = [];
    optionsCalls = 0;
    mocks.navigateToCheckout.mockReset();
});

describe('useExtensionCheckoutReview', () => {
    it('sends the option, both consents and the terms version from config, then redirects', async () => {
        serveExtension(() => HttpResponse.json({ orderId: 'order-9', redirectUrl: 'https://pay.test/session' }));
        const { result } = await renderLoaded();

        await act(() => result.current.startCheckout({ requestsImmediateStart: true, acknowledgesWithdrawalTerms: true }));

        expect(checkoutBodies).toEqual([
            { coverageOptionId: 'ext-3', requestsImmediateStart: true, acknowledgesWithdrawalTerms: true, termsVersion: 'terms-from-config' },
        ]);
        expect(mocks.navigateToCheckout).toHaveBeenCalledWith('event-1', { orderId: 'order-9', redirectUrl: 'https://pay.test/session' });
    });

    it('marks coverage as ended on 5085 and does not redirect', async () => {
        serveExtension(() => problem(409, 5085));
        const { result } = await renderLoaded();

        await act(async () => {
            await expect(result.current.startCheckout({ requestsImmediateStart: true, acknowledgesWithdrawalTerms: true })).rejects.toThrow();
        });

        expect(result.current.ended).toBe(true);
        expect(mocks.navigateToCheckout).not.toHaveBeenCalled();
    });

    it('treats a 5085 on the options as ended, not as a load failure', async () => {
        server.use(
            http.get(`${API}/api/config`, () => HttpResponse.json({ withdrawal: { termsVersion: 'terms-from-config' } })),
            http.get(`${API}/api/events/event-1/extension-options`, () => problem(409, 5085)),
        );
        const { result } = renderReview();

        await waitFor(() => expect(result.current.ended).toBe(true));
        expect(result.current.error).toBeNull();
        expect(result.current.option).toBeNull();
    });

    it('refetches the options when the option is no longer offered (5077)', async () => {
        serveExtension(() => problem(400, 5077));
        const { result } = await renderLoaded();
        expect(optionsCalls).toBe(1);

        await act(async () => {
            await expect(result.current.startCheckout({ requestsImmediateStart: true, acknowledgesWithdrawalTerms: true })).rejects.toThrow();
        });

        await waitFor(() => expect(optionsCalls).toBe(2));
        expect(result.current.ended).toBe(false);
    });
});
