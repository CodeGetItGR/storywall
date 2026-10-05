import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React, { type ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemePresetDrawer } from '@/hooks/useThemePresetDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminThemePresetDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), upload: vi.fn() }));

vi.mock('@/hooks/useAdminThemePresets', () => ({
    adminThemePresetKeys: { all: ['admin', 'theme-presets'] },
    useCreateThemePreset: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchThemePreset: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useUploadThemePresetIllustration: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));
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

beforeEach(() => {
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

describe('useThemePresetDrawer contrast', () => {
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
