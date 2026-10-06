import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React, { type ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemePresetDrawer } from '@/hooks/useThemePresetDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminThemeFontDto, AdminThemePresetDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    create: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
    fonts: { data: undefined as AdminThemeFontDto[] | undefined, isPending: false, isError: false },
}));

vi.mock('@/hooks/useAdminThemePresets', () => ({
    adminThemePresetKeys: { all: ['admin', 'theme-presets'] },
    useCreateThemePreset: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchThemePreset: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useUploadThemePresetIllustration: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));
vi.mock('@/hooks/useAdminThemeFonts', () => ({ useAdminThemeFonts: () => mocks.fonts }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

const PRESET: AdminThemePresetDto = {
    id: 'p1',
    key: 'dino-mint',
    name: { en: 'Dino', el: 'Δεινόσαυρος' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    eventTypes: ['BAPTISM'],
    sortOrder: 0,
    archived: false,
    titleColor: null,
    headingFont: null,
};

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
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

function renderDrawer(preset: AdminThemePresetDto | null = null, onDoneAction = vi.fn()) {
    return renderHook(() => useThemePresetDrawer({ preset, sortOrder: 3, onDoneAction }), { wrapper });
}

function fillValidDraft(result: { current: ReturnType<typeof useThemePresetDrawer> }) {
    act(() => result.current.handleFieldChange(field('key', 'dino-mint')));
    act(() => result.current.handleFieldChange(field('nameEn', 'Dino')));
    act(() => result.current.handleFieldChange(field('nameEl', 'Δεινόσαυρος')));
    act(() => result.current.handleFieldChange(field('backgroundColor', '#bfe6e2')));
    act(() => result.current.handleEventTypeChange(field('eventType', 'BAPTISM')));
}

const ALEGREYA: AdminThemeFontDto = {
    id: 'f1',
    key: 'alegreya',
    familyName: 'Alegreya',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/alegreya/1.woff2',
    presetCount: 0,
};
const BREE: AdminThemeFontDto = { ...ALEGREYA, id: 'f2', key: 'bree', familyName: 'Bree', url: '/api/theme-fonts/bree/3.woff2' };

function select(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLSelectElement>;
}

beforeEach(() => {
    mocks.fonts = { data: [ALEGREYA, BREE], isPending: false, isError: false };
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.upload.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useThemePresetDrawer', () => {
    it('does not save an invalid draft and shows what is missing', async () => {
        const { result } = renderDrawer();
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ key: true, nameEn: true, nameEl: true, eventTypes: true });
    });

    it('creates the preset, then uploads the chosen illustration', async () => {
        const onDoneAction = vi.fn();
        const file = new File(['x'], 'dino.png', { type: 'image/png' });
        mocks.create.mockResolvedValue({ ...PRESET, illustrationUrl: null });
        mocks.upload.mockResolvedValue(PRESET);
        const { result } = renderDrawer(null, onDoneAction);

        fillValidDraft(result);
        act(() => result.current.handleFileChange(fileChange(file)));
        expect(result.current.previewIllustrationUrl).toBe('blob:preview');
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({
            key: 'dino-mint',
            name: { en: 'Dino', el: 'Δεινόσαυρος' },
            backgroundColor: '#BFE6E2',
            eventTypes: ['BAPTISM'],
            sortOrder: 3,
            headingFontId: null,
            titleColor: null,
        });
        expect(mocks.upload).toHaveBeenCalledWith({ id: 'p1', file });
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('retries a failed upload without creating the preset twice', async () => {
        const onDoneAction = vi.fn();
        const file = new File(['x'], 'dino.png', { type: 'image/png' });
        mocks.create.mockResolvedValue({ ...PRESET, illustrationUrl: null });
        mocks.upload.mockRejectedValueOnce(new ApiError(500, null)).mockResolvedValueOnce(PRESET);
        const { result } = renderDrawer(null, onDoneAction);

        fillValidDraft(result);
        act(() => result.current.handleFileChange(fileChange(file)));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure?.kind).toBe('other');
        expect(result.current.isCreate).toBe(false);

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('sends only the changed fields when editing', async () => {
        mocks.patch.mockResolvedValue(PRESET);
        const { result } = renderDrawer(PRESET);

        act(() => result.current.handleFieldChange(field('nameEn', 'Dino party')));
        act(() => result.current.handleAvailabilityChange('ARCHIVED'));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.patch).toHaveBeenCalledWith({ id: 'p1', input: { name: { en: 'Dino party', el: 'Δεινόσαυρος' }, archived: true } });
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('reports a taken key on a 409 from create', async () => {
        mocks.create.mockRejectedValue(new ApiError(409, { errorCode: 3000 }));
        const { result } = renderDrawer();

        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.failure).toEqual({ kind: 'keyTaken' });
    });

    it('refuses a file that is not PNG or WebP', () => {
        const { result } = renderDrawer(PRESET);
        act(() => result.current.handleFileChange(fileChange(new File(['x'], 'dino.jpg', { type: 'image/jpeg' }))));
        expect(result.current.fileError).toBe('type');
        expect(result.current.previewIllustrationUrl).toBe(PRESET.illustrationUrl);
    });

    it('previews the draft colour and name', () => {
        const { result } = renderDrawer(PRESET);
        act(() => result.current.handleFieldChange(field('backgroundColor', 'not-a-colour')));
        expect(result.current.previewColor).toBeNull();
        expect(result.current.previewTitle).toBe('Dino');
    });
});

describe('useThemePresetDrawer double submit', () => {
    it('sends one create when the form is submitted twice before the first settles', async () => {
        let finish: (preset: AdminThemePresetDto) => void = () => undefined;
        mocks.create.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const { result } = renderDrawer();
        fillValidDraft(result);

        await act(async () => {
            const first = result.current.handleSubmit(submitEvent());
            const second = result.current.handleSubmit(submitEvent());
            finish({ ...PRESET, illustrationUrl: null });
            await Promise.all([first, second]);
        });

        expect(mocks.create).toHaveBeenCalledTimes(1);
    });
});

describe('useThemePresetDrawer contrast', () => {
    it('saves a preset whose own colour is too dark for the ink text, as long as the colour is untouched', async () => {
        const dark = { ...PRESET, backgroundColor: '#1A1A1A' };
        mocks.patch.mockResolvedValue({ ...dark, archived: true });
        const { result } = renderDrawer(dark);
        act(() => result.current.handleAvailabilityChange('ARCHIVED'));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.errors).toEqual({});
        expect(mocks.patch).toHaveBeenCalledWith({ id: 'p1', input: { archived: true } });
    });

    it('still blocks a changed colour that is too dark', async () => {
        const { result } = renderDrawer(PRESET);
        act(() => result.current.handleFieldChange(field('backgroundColor', '#1A1A1A')));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.patch).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ backgroundContrast: true });
    });

    it('blocks save and reports the ratio when the colour is too dark for the ink text', async () => {
        const { result } = renderDrawer();
        fillValidDraft(result);
        act(() => result.current.handleFieldChange(field('backgroundColor', '#1A1A1A')));

        expect(result.current.contrastRatio).toBeLessThan(4.5);
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ backgroundContrast: true });
    });

    it('has no ratio while the colour is invalid and a passing one for a light colour', () => {
        const { result } = renderDrawer(PRESET);
        expect(result.current.contrastRatio).toBeGreaterThanOrEqual(4.5);
        act(() => result.current.handleFieldChange(field('backgroundColor', 'nope')));
        expect(result.current.contrastRatio).toBeNull();
    });

    it('shows the server detail when it still rejects the colour', async () => {
        const problem = { status: 400, errorCode: 3001, detail: "backgroundColor is too dark for the app's text: contrast 3.60:1, minimum 4.5:1." };
        mocks.create.mockRejectedValue(new ApiError(400, problem));
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure?.kind).toBe('other');
    });
});

describe('useThemePresetDrawer title colour and heading font', () => {
    it('sends the picked font and an upper-cased title colour on create', async () => {
        mocks.create.mockResolvedValue(PRESET);
        const { result } = renderDrawer();
        fillValidDraft(result);
        act(() => result.current.handleFieldChange(select('headingFontId', 'f2')));
        act(() => result.current.handleFieldChange(field('titleColor', '#7a1f3d')));

        expect(result.current.previewTitleColor).toBe('#7a1f3d');
        expect(result.current.previewFont).toEqual({ key: 'bree', fallback: 'serif', url: '/api/theme-fonts/bree/3.woff2' });
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ headingFontId: 'f2', titleColor: '#7A1F3D' }));
    });

    it('sends the clear flags when an edit empties them', async () => {
        const styled = { ...PRESET, titleColor: '#1F4D49', headingFont: { ...ALEGREYA } };
        mocks.patch.mockResolvedValue(PRESET);
        const { result } = renderDrawer(styled);
        expect(result.current.draft.headingFontId).toBe('f1');

        act(() => result.current.handleUseInk());
        act(() => result.current.handleFieldChange(select('headingFontId', '')));
        expect(result.current.previewFont).toBeNull();
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.patch).toHaveBeenCalledWith({ id: 'p1', input: { clearTitleColor: true, clearHeadingFont: true } });
    });

    it('blocks save on a title colour too close to the background', async () => {
        const { result } = renderDrawer();
        fillValidDraft(result);
        act(() => result.current.handleFieldChange(field('titleColor', '#C8EEEA')));

        expect(result.current.titleContrastRatio).toBeLessThan(3);
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ titleContrast: true });
    });

    it('has no title ratio or preview colour for the ink default or a malformed value', () => {
        const { result } = renderDrawer(PRESET);
        expect(result.current.titleContrastRatio).toBeNull();
        expect(result.current.previewTitleColor).toBeNull();
        // The picker shows the ink colour while the title uses it.
        expect(result.current.titleColorInputValue).toBe('#241f1a');
        act(() => result.current.handleFieldChange(field('titleColor', '#12')));
        expect(result.current.titleContrastRatio).toBeNull();
        expect(result.current.previewTitleColor).toBeNull();
    });

    it('keeps an archived font the preset already has among the options, selected', () => {
        const archived = { ...ALEGREYA, id: 'f9', key: 'old', familyName: 'Old', archived: true };
        mocks.fonts = { data: [BREE, { ...archived, presetCount: 1 }], isPending: false, isError: false };
        const { result } = renderDrawer({ ...PRESET, headingFont: archived });

        expect(result.current.draft.headingFontId).toBe('f9');
        expect(result.current.fontOptions.map((option) => [option.id, option.status])).toEqual([
            ['f2', 'live'],
            ['f9', 'archived'],
        ]);
        expect(result.current.hasUsableFonts).toBe(true);
    });

    it('reports the font list loading and failing without dropping the assigned font', () => {
        mocks.fonts = { data: undefined, isPending: true, isError: false };
        const { result, rerender } = renderDrawer({ ...PRESET, headingFont: ALEGREYA });
        expect(result.current.fontsStatus).toBe('loading');
        expect(result.current.fontOptions.map((option) => option.id)).toEqual(['f1']);

        mocks.fonts = { data: undefined, isPending: false, isError: true };
        rerender();
        expect(result.current.fontsStatus).toBe('error');

        mocks.fonts = { data: [{ ...ALEGREYA, archived: true }], isPending: false, isError: false };
        rerender();
        expect(result.current.fontsStatus).toBe('ready');
        expect(result.current.hasUsableFonts).toBe(false);
    });

    it('reads a 5145 on create as a server failure, not a taken key', async () => {
        mocks.create.mockRejectedValue(new ApiError(409, { errorCode: 5145, detail: 'Δεν μπορεί να χρησιμοποιηθεί.' }));
        const { result } = renderDrawer();
        fillValidDraft(result);
        act(() => result.current.handleFieldChange(select('headingFontId', 'f1')));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.failure?.kind).toBe('other');
    });
});
