import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { type ReactNode, StrictMode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraftServer, TEST_API } from '@/hooks/invitationDraftTestServer';
import { useStartInvitationDraft } from '@/hooks/useStartInvitationDraft';
import { invitationDraftKeys } from '@/lib/invitation/drafts';
import { routes } from '@/lib/routes';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));

const backend = createDraftServer();
let starts = 0;

function renderStart() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <StrictMode>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </StrictMode>
    );
    return { queryClient, ...renderHook(() => useStartInvitationDraft('olive'), { wrapper }) };
}

describe('useStartInvitationDraft', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    beforeEach(() => {
        starts = 0;
        mocks.replace.mockReset();
        backend.server.events.on('request:start', ({ request }) => {
            if (request.method === 'POST') starts += 1;
        });
    });
    afterEach(() => {
        cleanup();
        backend.server.events.removeAllListeners();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('starts one draft and opens it in the editor', async () => {
        const { queryClient } = renderStart();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(routes.saveMyDateEditor('draft-new')));
        expect(starts).toBe(1);
        expect(queryClient.getQueryData(invitationDraftKeys.detail('draft-new'))).toMatchObject({ themeSlug: 'olive' });
    });

    it('can try again after a failure', async () => {
        backend.server.use(http.post(`${TEST_API}/api/invitation-drafts`, () => HttpResponse.json({ status: 500 }, { status: 500 })));
        const { result } = renderStart();
        await waitFor(() => expect(result.current.isError).toBe(true));

        backend.server.resetHandlers();
        act(() => result.current.retry());

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(routes.saveMyDateEditor('draft-new')));
    });
});
