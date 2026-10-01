import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';
import { getErrorCode } from '@/lib/api/errors';
import type { OrderSummaryDto, WithdrawalPreviewResponseDto } from '@/lib/api/types';

// Hoisted above the imports, so the API client reads it when it loads.
const API = vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
    return 'http://api.test';
});

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string) => key,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { firstName: 'Ana', lastName: 'K', email: 'ana@example.com' } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `error-${String(getErrorCode(error))}`,
    useRetryAfterCountdown: () => 0,
}));

const activation = { id: 'order-1', kind: 'ACTIVATION', breakdown: null } as unknown as OrderSummaryDto;
const upgrade = { id: 'order-2', kind: 'UPGRADE', breakdown: null } as unknown as OrderSummaryDto;

function previewOf(overrides: Partial<WithdrawalPreviewResponseDto> = {}): WithdrawalPreviewResponseDto {
    return {
        eligible: true,
        refusals: [],
        windowClosesAt: '2026-10-10T21:59:59Z',
        totalRefundMinor: 5000,
        currency: 'EUR',
        lines: [],
        scheduleMovedAfterPayment: false,
        scope: 'EVENT',
        orderId: 'order-1',
        instant: false,
        storageAfter: null,
        excludedOrders: [],
        confirmationToken: 'token-1',
        ...overrides,
    };
}

function problem(status: number, errorCode: number) {
    return HttpResponse.json({ status, errorCode, title: 'error' }, { status, headers: { 'Content-Type': 'application/problem+json' } });
}

const server = setupServer();
let previews: WithdrawalPreviewResponseDto[] = [];
let previewCalls = 0;
let bodies: { path: string; body: unknown }[] = [];

function servePreviews(submit: () => Response = () => HttpResponse.json({ id: 'w-1', status: 'REFUNDED' }, { status: 201 })) {
    const nextPreview = () => {
        const preview = previews[Math.min(previewCalls, previews.length - 1)];
        previewCalls += 1;
        return HttpResponse.json(preview);
    };
    const record = async (request: Request) => {
        bodies.push({ path: new URL(request.url).pathname, body: await request.json() });
        return submit();
    };
    server.use(
        http.get(`${API}/api/events/event-1/withdrawal-preview`, nextPreview),
        http.get(`${API}/api/events/event-1/orders/order-2/withdrawal-preview`, nextPreview),
        http.post(`${API}/api/events/event-1/withdrawals`, ({ request }) => record(request)),
        http.post(`${API}/api/events/event-1/orders/order-2/withdrawals`, ({ request }) => record(request)),
    );
}

function renderFlow() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useOrderWithdrawalFlow('event-1', { currentLimitBytes: null }), { wrapper });
}

async function openLoaded(order: OrderSummaryDto) {
    const view = renderFlow();
    act(() => view.result.current.open(order));
    await waitFor(() => expect(view.result.current.preview).not.toBeNull());
    return view;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
});
afterAll(() => server.close());
beforeEach(() => {
    previews = [previewOf()];
    previewCalls = 0;
    bodies = [];
});

describe('useOrderWithdrawalFlow', () => {
    it('sends the confirmed preview token for a whole-event withdrawal', async () => {
        servePreviews();
        const { result } = await openLoaded(activation);

        await act(() => result.current.confirm());

        expect(bodies).toEqual([{ path: '/api/events/event-1/withdrawals', body: { confirmationToken: 'token-1' } }]);
        expect(result.current.isOpen).toBe(false);
    });

    it('sends the token and the reason for a single-order withdrawal', async () => {
        previews = [previewOf({ scope: 'ORDER', orderId: 'order-2', confirmationToken: 'token-order' })];
        servePreviews();
        const { result } = await openLoaded(upgrade);

        act(() => result.current.handleReasonChange({ target: { value: '  changed plans ' } } as never));
        await act(() => result.current.confirm());

        expect(bodies).toEqual([
            { path: '/api/events/event-1/orders/order-2/withdrawals', body: { reason: 'changed plans', confirmationToken: 'token-order' } },
        ]);
    });

    it.each([
        ['stale (5095)', 409, 5095],
        ['invalid (5094)', 400, 5094],
    ])('reloads the preview and keeps the modal open when the token is %s', async (_label, status, code) => {
        previews = [previewOf(), previewOf({ totalRefundMinor: 4800, confirmationToken: 'token-2' })];
        servePreviews(() => problem(status, code));
        const { result } = await openLoaded(activation);

        await act(() => result.current.confirm());

        expect(result.current.error).toBe(`error-${code}`);
        expect(result.current.isOpen).toBe(true);
        await waitFor(() => expect(result.current.preview?.totalRefundMinor).toBe(4800));
        expect(result.current.preview?.confirmationToken).toBe('token-2');
    });

    it('fetches a new token before confirming a preview close to expiry', async () => {
        previews = [previewOf(), previewOf({ confirmationToken: 'token-fresh' })];
        servePreviews();
        const { result } = await openLoaded(activation);

        const later = Date.now() + 10 * 60 * 1000;
        vi.spyOn(Date, 'now').mockReturnValue(later);
        await act(() => result.current.confirm());

        expect(bodies).toEqual([{ path: '/api/events/event-1/withdrawals', body: { confirmationToken: 'token-fresh' } }]);
    });

    it('files nothing when the re-fetched preview shows a different refund', async () => {
        previews = [previewOf(), previewOf({ totalRefundMinor: 4200, confirmationToken: 'token-fresh' })];
        servePreviews();
        const { result } = await openLoaded(activation);

        vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10 * 60 * 1000);
        await act(() => result.current.confirm());

        expect(bodies).toEqual([]);
        expect(result.current.error).toBe('withdrawalPreviewStale');
        expect(result.current.preview?.totalRefundMinor).toBe(4200);
    });
});
