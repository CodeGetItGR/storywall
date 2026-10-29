import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React, { type ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, AdminThemeFontDto } from '@/lib/api/types';
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

const mocks = vi.hoisted(() => ({
    create: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
    fonts: { data: [] as AdminThemeFontDto[] | undefined, isPending: false, isError: false },
}));

vi.mock('@/hooks/useAdminQrCardTemplates', () => ({
    adminQrCardTemplateKeys: { all: ['admin', 'qr-card-templates'] },
    useCreateQrCardTemplate: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchQrCardTemplate: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useUploadQrCardArtwork: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));
vi.mock('@/hooks/useAdminThemeFonts', () => ({ adminThemeFontKeys: { all: ['admin', 'theme-fonts'] }, useAdminThemeFonts: () => mocks.fonts }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    artworkWidth: null,
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function field(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function fileChange(file: File) {
    return { currentTarget: { files: [file], value: 'C:\\fakepath\\x' } } as unknown as ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function renderDrawer(template: AdminQrCardTemplateDto | null = null, onDoneAction = vi.fn()) {
    return renderHook(() => useQrCardTemplateDrawer({ template, sortOrder: 2, onDoneAction }), { wrapper });
}

beforeEach(() => {
    queryClient = new QueryClient();
    mocks.fonts = { data: [], isPending: false, isError: false };
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.upload.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:artwork');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useQrCardTemplateDrawer', () => {
    it('previews the saved layout, or the default without one', () => {
        const layout = { ...DEFAULT_QR_CARD_LAYOUT, title: { ...DEFAULT_QR_CARD_LAYOUT.title, align: 'left' as const } };
        expect(renderDrawer({ ...LINEN, layout }).result.current.previewStyle.layout).toEqual(layout);
        expect(renderDrawer(LINEN).result.current.previewStyle.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
    });

    it('does not save an invalid draft and shows what is missing', async () => {
        const { result } = renderDrawer();
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ nameEn: true, nameEl: true, eventTypes: true });
    });

    it('creates the design, then uploads the artwork', async () => {
        const onDoneAction = vi.fn();
        const file = new File(['x'], 'linen.png', { type: 'image/png' });
        mocks.create.mockResolvedValue({ ...LINEN, artworkUrl: null });
        mocks.upload.mockResolvedValue(LINEN);
        const { result } = renderDrawer(null, onDoneAction);

        act(() => result.current.handleFieldChange(field('nameEn', 'Linen')));
        act(() => result.current.handleFieldChange(field('nameEl', 'Λινό')));
        act(() => result.current.handleEventTypeChange(field('eventType', 'WEDDING')));
        act(() => result.current.handleFileChange(fileChange(file)));
        expect(result.current.previewStyle.artworkUrl).toBe('blob:artwork');
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING'],
            sortOrder: 2,
            textColor: '#241F1A',
            headingFontId: null,
            codeColor: '#241F1A',
            centerLogo: true,
        });
        expect(mocks.upload).toHaveBeenCalledWith({ id: 't1', file });
        expect(onDoneAction).toHaveBeenCalled();
    });

    it('keeps the saved design open and named when the artwork upload fails after a create', async () => {
        mocks.create.mockResolvedValue({ ...LINEN, artworkUrl: null });
        mocks.upload.mockRejectedValue(new ApiError(500, {}));
        const { result } = renderDrawer();
        expect(result.current.isCreate).toBe(true);
        expect(result.current.savedName).toBe('');

        act(() => result.current.handleFieldChange(field('nameEn', 'Linen')));
        act(() => result.current.handleFieldChange(field('nameEl', 'Λινό')));
        act(() => result.current.handleEventTypeChange(field('eventType', 'WEDDING')));
        act(() => result.current.handleFileChange(fileChange(new File(['x'], 'linen.png', { type: 'image/png' }))));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.isCreate).toBe(false);
        expect(result.current.savedName).toBe('Linen');
    });

    it('sends only what changed', async () => {
        mocks.patch.mockResolvedValue(LINEN);
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('textColor', '#2b2b2b')));
        act(() => result.current.handleCenterLogoChange(true));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).toHaveBeenCalledWith({ id: 't1', input: { textColor: '#2B2B2B', centerLogo: true } });
    });

    it('closes without a request when nothing changed', async () => {
        const onDoneAction = vi.fn();
        const { result } = renderDrawer(LINEN, onDoneAction);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(onDoneAction).toHaveBeenCalled();
    });

    it('holds back a code colour too light to scan', async () => {
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('codeColor', '#777777')));
        expect(result.current.codeContrastRatio).toBeLessThan(4.5);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ codeContrast: true });
    });

    it('draws the preview from the draft, in ink while a colour is half typed', () => {
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('textColor', '#5A3')));
        expect(result.current.previewStyle).toMatchObject({
            artworkUrl: LINEN.artworkUrl,
            textColor: '#241F1A',
            codeColor: '#1F3A5A',
            centerLogo: false,
        });
    });

    it('refetches the list when the design is gone, and the fonts when its font is', async () => {
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('nameEn', 'Linen 2')));

        mocks.patch.mockRejectedValueOnce(new ApiError(404, {}));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'notFound' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'qr-card-templates'] });

        mocks.patch.mockRejectedValueOnce(new ApiError(409, { errorCode: 5145 }));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'theme-fonts'] });
    });
});
