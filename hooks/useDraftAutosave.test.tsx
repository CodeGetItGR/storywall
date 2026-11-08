import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useLayoutEffect } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createDraftServer } from '@/hooks/invitationDraftTestServer';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/invitation/draftAutosave';
import { invitationDraftKeys } from '@/lib/invitation/drafts';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { SampleDraftDto } from '@/lib/invitation/sampleDraft';

// Hoisted above the imports, so the API client reads it when it loads. Same as TEST_API.
vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const backend = createDraftServer();

function setColor(store: ReturnType<typeof createInvitationEditorStore>, color: string) {
    act(() =>
        store.getState().edit((draft) => {
            draft.overrides.textColor = color;
        }),
    );
}

function renderAutosave() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const draft = backend.stored();
    queryClient.setQueryData(invitationDraftKeys.detail(draft.id), draft);
    const store = createInvitationEditorStore(draft.document);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useDraftAutosave(store, draft.id, draft.revision), { wrapper });
    return { queryClient, store, ...hook };
}

describe('useDraftAutosave', () => {
    beforeAll(() => backend.server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        backend.reset();
    });
    afterAll(() => backend.server.close());

    it('saves a change after the pause and keeps the cache up to date', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { result, store, queryClient } = renderAutosave();
        expect(result.current.status).toBe('saved');

        setColor(store, '#123456');
        expect(result.current.status).toBe('unsaved');
        expect(backend.saves).toHaveLength(0);

        await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS));
        await waitFor(() => expect(result.current.status).toBe('saved'));

        expect(backend.saves).toEqual([{ revision: 4, document: store.getState().document }]);
        const cached = queryClient.getQueryData<SampleDraftDto>(invitationDraftKeys.detail('draft-1'));
        expect(cached?.revision).toBe(5);
        expect(cached?.document.overrides.textColor).toBe('#123456');
    });

    it('saves at once on flush', async () => {
        const { result, store } = renderAutosave();
        setColor(store, '#123456');

        let saved = false;
        await act(async () => {
            saved = await result.current.flush();
        });

        expect(saved).toBe(true);
        expect(backend.saves).toHaveLength(1);
        expect(result.current.status).toBe('saved');
    });

    it('sends what is unsaved when the editor closes', async () => {
        const { store, unmount } = renderAutosave();
        setColor(store, '#654321');
        unmount();

        await waitFor(() => expect(backend.saves).toHaveLength(1));
        expect(backend.stored().document.overrides.textColor).toBe('#654321');
    });

    it('stops saving when the draft was changed elsewhere', async () => {
        const { result, store } = renderAutosave();
        backend.saveElsewhere({ ...backend.stored().document, overrides: { ...backend.stored().document.overrides, textColor: '#000000' } });
        setColor(store, '#123456');

        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.status).toBe('conflict');
        expect(backend.stored().document.overrides.textColor).toBe('#000000');
    });

    it('carries on when a refused save turns out to be stored already', async () => {
        const { result, store } = renderAutosave();
        setColor(store, '#123456');
        // The save landed, but the editor was told it was stale.
        backend.saveElsewhere(store.getState().document);
        backend.refuseNextSaveAsStale();

        await act(async () => {
            await result.current.flush();
        });
        expect(result.current.status).toBe('saved');

        setColor(store, '#abcdef');
        await act(async () => {
            await result.current.flush();
        });
        expect(result.current.status).toBe('saved');
        expect(backend.saves.at(-1)?.revision).toBe(5);
    });

    it('saves an edit made before the autosave started', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const draft = backend.stored();
        const store = createInvitationEditorStore(draft.document);
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
        // Layout effects run before the hook's own effect starts the autosave.
        const { result } = renderHook(
            () => {
                const autosave = useDraftAutosave(store, draft.id, draft.revision);
                useLayoutEffect(() => {
                    store.getState().edit((next) => {
                        next.overrides.textColor = '#0a0b0c';
                    });
                }, []);
                return autosave;
            },
            { wrapper },
        );

        expect(result.current.status).toBe('unsaved');
        await act(async () => {
            await result.current.flush();
        });
        expect(backend.stored().document.overrides.textColor).toBe('#0a0b0c');
    });

    it('sends nothing on flush when nothing changed', async () => {
        const { result } = renderAutosave();
        let saved = false;
        await act(async () => {
            saved = await result.current.flush();
        });
        expect(saved).toBe(true);
        expect(backend.saves).toHaveLength(0);
    });
});
