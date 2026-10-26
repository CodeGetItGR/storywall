import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { MediaResponseDto, PrintListDto, PrintListItemDto, PrintPhotographerDto } from '@/lib/api/types';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn(), download: vi.fn() }));
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: Error) => `mapped:${error.message}` }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: { count: number }) => (values ? `${key}:${values.count}` : key),
}));

import { useGalleryPrint } from '@/hooks/useGalleryPrint';
import { printListKeys } from '@/hooks/usePrintLists';

const photographer = (vendorId: string): PrintPhotographerDto => ({
    vendorId,
    businessName: vendorId,
    logoUrl: null,
    accessEndsAt: '2030-01-01T00:00:00Z',
    hostPrintsIncluded: 0,
    sizes: [],
});
const photographers = [photographer('v1'), photographer('v2')];

const photo = (id: string, overrides: Partial<MediaResponseDto> = {}) =>
    ({ id, mediaType: 'IMAGE', status: 'READY', ...overrides }) as MediaResponseDto;
const media = [photo('m1'), photo('m2'), photo('m3'), photo('clip', { mediaType: 'VIDEO' })];

const item = (id: string, mediaId: string): PrintListItemDto => ({
    id,
    mediaId,
    media: null,
    removed: false,
    sizeId: null,
    sizeLabel: null,
    unitPriceCents: null,
    copies: 1,
});
const listOf = (items: PrintListItemDto[]): PrintListDto => ({
    id: 'l1',
    vendorId: 'v1',
    ownerKind: 'HOST',
    status: 'OPEN',
    sentAt: null,
    ownerName: null,
    contactEmail: null,
    contactPhone: null,
    totalCents: null,
    removedCount: 0,
    items,
});

type Props = Partial<Parameters<typeof useGalleryPrint>[0]>;

// A host list that already holds m1.
function setup(initial: Props = {}, prepare?: () => void) {
    const current = listOf([item('i1', 'm1')]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    queryClient.setQueryData(printListKeys.host('e1', 'v1'), current);
    api.get.mockResolvedValue(current);
    prepare?.();
    const onAdded = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const view = renderHook(
        (props: Props) =>
            useGalleryPrint({
                eventId: 'e1',
                isHost: true,
                available: true,
                photographers,
                media,
                selectedIds: new Set<string>(),
                viewerMedia: null,
                onAdded,
                ...props,
            }),
        { wrapper, initialProps: initial },
    );
    return { ...view, onAdded, queryClient };
}

describe('useGalleryPrint', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.useRealTimers());

    it('uses the first photographer, and falls back to it when the chosen one leaves', () => {
        const { result, rerender } = setup();
        expect(result.current.photographer?.vendorId).toBe('v1');
        act(() => result.current.selectPhotographer('v2'));
        expect(result.current.photographer?.vendorId).toBe('v2');
        rerender({ photographers: [photographers[0]] });
        expect(result.current.photographer?.vendorId).toBe('v1');
    });

    it('counts only photos that were not on the list yet', async () => {
        const { result, rerender, onAdded } = setup({ selectedIds: new Set(['m1', 'm2']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        await act(() => result.current.addSelected());
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/host/items', { vendorId: 'v1', mediaIds: ['m1', 'm2'] });
        expect(onAdded).toHaveBeenCalledTimes(1);
        // The caller clears the selection after an add; the notice shows once it is empty.
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('addedFor:1');
    });

    it('leaves the photographer out of the notice when there is only one', async () => {
        const { result, rerender } = setup({ photographers: [photographer('v1')], selectedIds: new Set(['m2']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        await act(() => result.current.addSelected());
        rerender({ photographers: [photographer('v1')], selectedIds: new Set() });
        expect(result.current.notice).toBe('added:1');
    });

    it('says so when every photo was already on the list', async () => {
        const { result, rerender } = setup({ selectedIds: new Set(['m1']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1')]));
        await act(() => result.current.addSelected());
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('alreadyPicked');
    });

    it('keeps the skipped notice when some items could not be printed, and still ends selection', async () => {
        const { result, rerender, onAdded } = setup({ selectedIds: new Set(['m2', 'clip']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        await act(() => result.current.addSelected());
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/host/items', { vendorId: 'v1', mediaIds: ['m2'] });
        expect(onAdded).toHaveBeenCalledTimes(1);
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('skippedNotPrintable');
    });

    it('maps an add error and does not call onAdded', async () => {
        const { result, onAdded } = setup({ selectedIds: new Set(['m2']) });
        api.post.mockRejectedValue(new ApiError(500, {}, 'boom'));
        await act(() => result.current.addSelected());
        expect(result.current.error).toBe('mapped:boom');
        expect(onAdded).not.toHaveBeenCalled();
    });

    it('ignores a second add while one is running', async () => {
        const { result } = setup({ selectedIds: new Set(['m2']) });
        let resolve: (list: PrintListDto) => void = () => undefined;
        api.post.mockReturnValue(new Promise<PrintListDto>((res) => (resolve = res)));
        let first: Promise<void> = Promise.resolve();
        act(() => {
            first = result.current.addSelected();
            void result.current.addSelected();
        });
        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        await act(async () => {
            resolve(listOf([item('i1', 'm1'), item('i2', 'm2')]));
            await first;
        });
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('lets the viewer toggle add a photo that is not picked and remove one that is', async () => {
        const { result, rerender } = setup({ viewerMedia: media[1] });
        expect(result.current.viewerToggle?.picked).toBe(false);
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        await act(() => result.current.viewerToggle!.onToggle());
        expect(api.post).toHaveBeenCalledWith('/api/events/e1/print-lists/host/items', { vendorId: 'v1', mediaIds: ['m2'] });

        rerender({ viewerMedia: media[0] });
        expect(result.current.viewerToggle?.picked).toBe(true);
        api.del.mockResolvedValue(listOf([]));
        await act(() => result.current.viewerToggle!.onToggle());
        expect(api.del).toHaveBeenCalledWith('/api/events/e1/print-lists/items/i1');
    });

    it('keeps a viewer toggle error to the toggle', async () => {
        const { result } = setup({ viewerMedia: media[1] });
        api.post.mockRejectedValue(new ApiError(500, {}, 'boom'));
        await act(() => result.current.viewerToggle!.onToggle());
        expect(result.current.viewerToggle?.error).toBe('mapped:boom');
        expect(result.current.error).toBeNull();
    });

    it('reports a loading list, and turns the viewer toggle off until it is known', () => {
        const { result } = setup({ viewerMedia: media[1] });
        expect(result.current.isLoadingList).toBe(false);
        expect(result.current.viewerToggle?.disabled).toBe(false);
        // Another photographer: nothing cached yet, so the read is in flight.
        api.get.mockReturnValue(new Promise(() => undefined));
        act(() => result.current.selectPhotographer('v2'));
        expect(result.current.isLoadingList).toBe(true);
        expect(result.current.viewerToggle?.disabled).toBe(true);
    });

    it('reports a failed list read as an error, not as an empty list', async () => {
        // The other photographer's list is read at mount too, so it fails from the start.
        const { result } = setup({ viewerMedia: media[1] }, () =>
            api.get.mockImplementation(async (path: string) => {
                if (path.includes('v2')) throw new ApiError(500, {}, 'down');
                return listOf([item('i1', 'm1')]);
            }),
        );
        act(() => result.current.selectPhotographer('v2'));
        await waitFor(() => expect(result.current.listFailed).toBe(true));
        expect(result.current.items).toEqual([]);
        expect(result.current.error).toBe('mapped:down');
        expect(result.current.viewerToggle?.disabled).toBe(true);
    });

    it('has no viewer toggle for a video or when prints are unavailable', () => {
        expect(setup({ viewerMedia: media[3] }).result.current.viewerToggle).toBeNull();
        expect(setup({ viewerMedia: media[0], available: false }).result.current.viewerToggle).toBeNull();
    });

    it('fades the notice after four seconds, and a new selection ends it for good', async () => {
        const { result, rerender } = setup({ selectedIds: new Set(['m2']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        vi.useFakeTimers();
        await act(() => result.current.addSelected());
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('addedFor:1');
        rerender({ selectedIds: new Set(['m3']) });
        expect(result.current.notice).toBeNull();
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBeNull();

        rerender({ selectedIds: new Set(['m3']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2'), item('i3', 'm3')]));
        await act(() => result.current.addSelected());
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('addedFor:1');
        act(() => vi.advanceTimersByTime(3999));
        expect(result.current.notice).toBe('addedFor:1');
        act(() => vi.advanceTimersByTime(1));
        expect(result.current.notice).toBeNull();
    });

    it('does not bring a photographer error back when returning to them', async () => {
        const { result } = setup({ selectedIds: new Set(['m2']) });
        api.post.mockRejectedValue(new ApiError(500, {}, 'boom'));
        await act(() => result.current.addSelected());
        expect(result.current.error).toBe('mapped:boom');
        act(() => result.current.selectPhotographer('v2'));
        expect(result.current.error).toBeNull();
        act(() => result.current.selectPhotographer('v1'));
        expect(result.current.error).toBeNull();
    });

    it('keeps the viewer toggle error to its photo', async () => {
        const { result, rerender } = setup({ viewerMedia: media[1] });
        api.post.mockRejectedValue(new ApiError(500, {}, 'boom'));
        await act(() => result.current.viewerToggle!.onToggle());
        expect(result.current.viewerToggle?.error).toBe('mapped:boom');
        rerender({ viewerMedia: media[2] });
        expect(result.current.viewerToggle?.error).toBeNull();
        rerender({ viewerMedia: media[1] });
        expect(result.current.viewerToggle?.error).toBeNull();
    });

    it('does not carry a notice over to another photographer', async () => {
        const { result, rerender } = setup({ selectedIds: new Set(['m2']) });
        api.post.mockResolvedValue(listOf([item('i1', 'm1'), item('i2', 'm2')]));
        await act(() => result.current.addSelected());
        rerender({ selectedIds: new Set() });
        expect(result.current.notice).toBe('addedFor:1');
        act(() => result.current.selectPhotographer('v2'));
        expect(result.current.notice).toBeNull();
    });

    it('counts every photographer list on the pill', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(printListKeys.host('e1', 'v1'), listOf([]));
        queryClient.setQueryData(printListKeys.host('e1', 'v2'), listOf([item('i9', 'm3')]));
        api.get.mockImplementation(async (path: string) => (path.includes('v2') ? listOf([item('i9', 'm3')]) : listOf([])));
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
        const { result } = renderHook(
            () =>
                useGalleryPrint({
                    eventId: 'e1',
                    isHost: true,
                    available: true,
                    photographers,
                    media,
                    selectedIds: new Set<string>(),
                    viewerMedia: null,
                    onAdded: vi.fn(),
                }),
            { wrapper },
        );
        await waitFor(() => expect(result.current.showPill).toBe(true));
        expect(result.current.pickCount).toBe(1);
    });

    describe('useGalleryPrint with several lists', () => {
        beforeEach(() => vi.clearAllMocks());

        const hostPaths = () => api.get.mock.calls.map((call) => String(call[0]));

        it('reads a single list once', async () => {
            const { result } = setup({ photographers: [photographer('v1')] });
            await waitFor(() => expect(result.current.showPill).toBe(true));
            expect(hostPaths().filter((path) => path.includes('vendorId=v1')).length).toBeLessThanOrEqual(1);
        });

        it('leaves the error alone when a list that is not selected fails, and the pill counts the lists it could read', async () => {
            const { result, queryClient } = setup({}, () =>
                api.get.mockImplementation(async (path: string) => {
                    if (path.includes('v2')) throw new ApiError(500, {}, 'down');
                    return listOf([item('i1', 'm1')]);
                }),
            );
            await waitFor(() => expect(hostPaths().some((path) => path.includes('v2'))).toBe(true));
            await waitFor(() => expect(queryClient.getQueryState(printListKeys.host('e1', 'v2'))?.status).toBe('error'));
            expect(result.current.listFailed).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.pickCount).toBe(1);
            expect(result.current.showPill).toBe(true);
        });
    });
});
