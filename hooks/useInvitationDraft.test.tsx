import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createDraftServer, TEST_API } from '@/hooks/invitationDraftTestServer';
import { useInvitationDraft } from '@/hooks/useInvitationDraft';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const backend = createDraftServer();

function renderDraft() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useInvitationDraft('draft-1'), { wrapper });
}

describe('useInvitationDraft', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        cleanup();
        backend.server.resetHandlers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('loads the draft ready to edit', async () => {
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.draft).not.toBeNull());

        expect(result.current.draft?.revision).toBe(4);
        expect(result.current.draft?.media('m-top')).toBe('/images/venue.png');
        expect(result.current.isError).toBe(false);
    });

    it('brings in the stored copy on reload and starts over', async () => {
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.draft).not.toBeNull());
        backend.saveElsewhere({ ...backend.stored().document, overrides: { textColor: '#000000' } });

        await act(() => result.current.reload());

        expect(result.current.loadId).toBe(1);
        expect(result.current.draft?.revision).toBe(5);
        expect(result.current.draft?.document.overrides.textColor).toBe('#000000');
        expect(result.current.isReloading).toBe(false);
    });

    it('fails when the draft cannot be loaded', async () => {
        backend.server.use(http.get(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json({ status: 404 }, { status: 404 })));
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.draft).toBeNull();
    });

    it('fails when the stored draft is not a valid invitation', async () => {
        backend.server.use(
            http.get(`${TEST_API}/api/invitation-drafts/:id`, () => HttpResponse.json({ ...backend.stored(), design: { nope: true } })),
        );
        const { result } = renderDraft();
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.draft).toBeNull();
    });
});
