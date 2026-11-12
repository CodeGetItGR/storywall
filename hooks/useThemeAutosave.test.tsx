import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import { useThemeAutosave } from '@/hooks/useThemeAutosave';
import { type AdminInvitationThemeDto, type AdminInvitationThemeRequestDto, BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/invitation/draftAutosave';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { readEditableTheme, type ThemeSaveMode } from '@/lib/invitation/themeEditing';

vi.hoisted(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://api.test';
});

const THEME_URL = 'http://api.test/api/admin/invitation-themes/t1';

function storedTheme(overrides: Partial<AdminInvitationThemeDto> = {}): AdminInvitationThemeDto {
    return {
        id: 't1',
        eventType: 'WEDDING',
        status: 'DRAFT',
        name: 'Garden',
        slug: 'garden',
        code: null,
        description: null,
        cardColor: null,
        seoTitle: null,
        seoDescription: null,
        ogImageAssetId: null,
        cardThumbAssetId: null,
        productPhotos: [],
        sortOrder: 0,
        design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
        document: blankThemeDocument('WEDDING', 'garden') as unknown as Record<string, unknown>,
        revision: 4,
        assets: [],
        updatedAt: '2026-11-01T10:00:00Z',
        ...overrides,
    };
}

const saves: AdminInvitationThemeRequestDto[] = [];
const deleted: string[] = [];
let stale = false;
const server = setupServer(
    http.delete(`${THEME_URL}/assets/:assetId`, ({ params }) => {
        deleted.push(params.assetId as string);
        return new HttpResponse(null, { status: 204 });
    }),
    http.put(THEME_URL, async ({ request }) => {
        const body = (await request.json()) as AdminInvitationThemeRequestDto & { revision: number };
        if (stale) {
            return HttpResponse.json({ status: 409, errorCode: 5201, title: 'Stale' }, { status: 409, headers: { 'Content-Type': 'application/problem+json' } });
        }
        saves.push(body);
        return HttpResponse.json(
            storedTheme({ design: body.design, document: body.document, ogImageAssetId: body.ogImageAssetId, revision: body.revision + 1 }),
        );
    }),
    http.get(THEME_URL, () => HttpResponse.json(storedTheme({ revision: 9, design: { ...BLANK_THEME_DESIGN, photoShape: 'oval' } }))),
);

function renderThemeAutosave(mode: ThemeSaveMode, status: AdminInvitationThemeDto['status'] = 'DRAFT') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const theme = readEditableTheme(storedTheme({ status }));
    const store = createInvitationEditorStore(theme.document, theme.design, { imageId: null });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const hook = renderHook(() => useThemeAutosave(store, theme, mode), { wrapper });
    const setPrimary = (color: string) =>
        act(() =>
            store.getState().editTheme((design) => {
                design.colors.primary = color;
            }),
        );
    return { queryClient, store, setPrimary, ...hook };
}

describe('useThemeAutosave', () => {
    beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        saves.length = 0;
        deleted.length = 0;
        stale = false;
    });
    afterAll(() => server.close());

    it('saves a draft theme after the pause, with its details and revision', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { result, setPrimary, queryClient } = renderThemeAutosave('auto');
        setPrimary('#123456');
        expect(result.current.status).toBe('unsaved');

        await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS));
        await waitFor(() => expect(result.current.status).toBe('saved'));

        expect(saves).toHaveLength(1);
        expect(saves[0]).toMatchObject({ name: 'Garden', slug: 'garden', status: 'DRAFT', revision: 4 });
        expect((saves[0].design as { colors: { primary: string } }).colors.primary).toBe('#123456');
        expect(queryClient.getQueryData<AdminInvitationThemeDto>(adminInvitationThemeKeys.detail('t1'))?.revision).toBe(5);
    });

    it('waits for Save on a live theme', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const { result, setPrimary } = renderThemeAutosave('manual', 'ACTIVE');
        setPrimary('#123456');
        await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS * 5));
        expect(saves).toHaveLength(0);
        await expect(result.current.isSaved()).resolves.toBe(false);

        await act(async () => {
            await result.current.flush();
        });
        expect(saves).toHaveLength(1);
        expect(result.current.status).toBe('saved');
        await expect(result.current.isSaved()).resolves.toBe(true);
    });

    it('sends nothing when a live theme is left unsaved', async () => {
        const { setPrimary, unmount } = renderThemeAutosave('manual', 'ACTIVE');
        setPrimary('#123456');
        unmount();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(saves).toHaveLength(0);
    });

    it('reports a conflict when another admin saved first', async () => {
        stale = true;
        const { result, setPrimary } = renderThemeAutosave('manual', 'ACTIVE');
        setPrimary('#123456');
        await act(async () => {
            await result.current.flush();
        });
        await waitFor(() => expect(result.current.status).toBe('conflict'));
    });

    it('saves the share image with the theme', async () => {
        const { result, store } = renderThemeAutosave('manual', 'ACTIVE');
        act(() => store.getState().editTheme((_design, _document, share) => void (share.imageId = 'og-new')));
        await act(async () => {
            await result.current.flush();
        });
        expect(saves[0].ogImageAssetId).toBe('og-new');
    });

    it('deletes a removed image after a save that no longer uses it', async () => {
        const { result, store } = renderThemeAutosave('manual', 'ACTIVE');
        act(() =>
            store.getState().editTheme((design) => {
                design.art.main = { image: { mediaId: 'kept' }, scale: 1, animation: 'none' };
            }),
        );
        act(() => {
            result.current.markRemoved('gone');
            // Still in the theme: its file stays.
            result.current.markRemoved('kept');
        });
        await act(async () => {
            await result.current.flush();
        });
        await waitFor(() => expect(deleted).toEqual(['gone']));
    });
});
