import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React, { type ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeFontDrawer } from '@/hooks/useThemeFontDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminThemeFontDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), upload: vi.fn() }));

vi.mock('@/hooks/useAdminThemeFonts', () => ({
    adminThemeFontKeys: { all: ['admin', 'theme-fonts'] },
    useCreateThemeFont: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchThemeFont: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useUploadThemeFontFile: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));

const FONT: AdminThemeFontDto = {
    id: 'f1',
    key: 'gfs-didot',
    familyName: 'GFS Didot',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/gfs-didot/1.woff2',
    presetCount: 2,
};

// jsdom has no FontFace or document.fonts.
const fonts = { add: vi.fn(), delete: vi.fn() };
const faces: Array<{ family: string; source: unknown }> = [];
let loadResult: () => Promise<void> = () => Promise.resolve();

class FakeFontFace {
    family: string;
    source: unknown;
    constructor(family: string, source: unknown) {
        this.family = family;
        this.source = source;
        faces.push(this);
    }
    load() {
        return loadResult().then(() => this);
    }
}

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

function woff2(name = 'didot.woff2') {
    return new File([new Uint8Array([0x77, 0x4f, 0x46, 0x32])], name);
}

function ttf(name = 'didot.ttf') {
    return new File([new Uint8Array([0x00, 0x01, 0x00, 0x00])], name);
}

// A file whose first-bytes read waits until the test lets it go.
function slowFile(name: string): { file: File; release: () => void } {
    const file = woff2(name);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slice = file.slice.bind(file);
    Object.defineProperty(file, 'slice', {
        value: (start?: number, end?: number) => {
            const part = slice(start, end);
            return { arrayBuffer: () => gate.then(() => part.arrayBuffer()) };
        },
    });
    return { file, release };
}

function renderDrawer(font: AdminThemeFontDto | null = null, onDoneAction = vi.fn()) {
    return renderHook(() => useThemeFontDrawer({ font, onDoneAction }), { wrapper });
}

function fillValidDraft(result: { current: ReturnType<typeof useThemeFontDrawer> }) {
    act(() => result.current.handleFieldChange(field('key', 'gfs-didot')));
    act(() => result.current.handleFieldChange(field('familyName', 'GFS Didot')));
}

beforeEach(() => {
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.upload.mockReset();
    fonts.add.mockReset();
    fonts.delete.mockReset();
    faces.length = 0;
    loadResult = () => Promise.resolve();
    vi.stubGlobal('FontFace', FakeFontFace);
    Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('useThemeFontDrawer', () => {
    it('does not save an invalid draft and shows what is missing', async () => {
        const { result } = renderDrawer();
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ key: true, familyName: true });
    });

    it('lower-cases the key and turns other characters into hyphens as the admin types', () => {
        const { result } = renderDrawer();
        act(() => result.current.handleFieldChange(field('key', 'GFS Didot')));
        expect(result.current.draft.key).toBe('gfs-didot');
    });

    it('creates the font, then uploads the chosen file', async () => {
        const onDoneAction = vi.fn();
        const file = woff2();
        mocks.create.mockResolvedValue({ ...FONT, url: null, presetCount: 0 });
        mocks.upload.mockResolvedValue(FONT);
        const { result } = renderDrawer(null, onDoneAction);

        fillValidDraft(result);
        act(() => result.current.handleFallbackChange(field('fallback', 'sans-serif')));
        await act(() => result.current.handleFileChange(fileChange(file)));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({ key: 'gfs-didot', familyName: 'GFS Didot', fallback: 'sans-serif' });
        expect(mocks.upload).toHaveBeenCalledWith({ id: 'f1', file });
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('retries a failed upload without creating the font twice', async () => {
        const onDoneAction = vi.fn();
        mocks.create.mockResolvedValue({ ...FONT, url: null });
        mocks.upload.mockRejectedValueOnce(new ApiError(502, { errorCode: 5004, detail: 'storage' })).mockResolvedValueOnce(FONT);
        const { result } = renderDrawer(null, onDoneAction);

        fillValidDraft(result);
        await act(() => result.current.handleFileChange(fileChange(woff2())));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure?.kind).toBe('other');
        expect(result.current.isCreate).toBe(false);
        expect(result.current.createdWithoutFile).toBe(true);

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('refuses a file that is not a font, and uploads nothing', async () => {
        mocks.patch.mockResolvedValue(FONT);
        const { result } = renderDrawer(FONT);
        await act(() => result.current.handleFileChange(fileChange(new File(['x'], 'didot.ttf'))));
        expect(result.current.fileError).toBe('type');
        expect(result.current.hasPendingFile).toBe(false);

        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('sends only the changed fields when editing', async () => {
        mocks.patch.mockResolvedValue(FONT);
        const { result } = renderDrawer(FONT);

        act(() => result.current.handleFieldChange(field('familyName', 'Didot')));
        act(() => result.current.handleAvailabilityChange('ARCHIVED'));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.patch).toHaveBeenCalledWith({ id: 'f1', input: { familyName: 'Didot', archived: true } });
        expect(mocks.upload).not.toHaveBeenCalled();
    });
});

describe('useThemeFontDrawer failures', () => {
    it('reports a taken key on a 409 from create', async () => {
        mocks.create.mockRejectedValue(new ApiError(409, { errorCode: 5146, detail: 'taken' }));
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'keyTaken' });
    });

    it('puts a 3001 on the field it is about', async () => {
        mocks.create.mockRejectedValueOnce(new ApiError(400, { errorCode: 3001, detail: 'x', errors: { key: 'bad' } }));
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'keyInvalid' });

        mocks.create.mockRejectedValueOnce(new ApiError(400, { errorCode: 3001, detail: 'The display name must be 1 to 100 characters.' }));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'familyNameInvalid' });
    });

    it('puts a 3095 on the display name', async () => {
        mocks.create.mockRejectedValueOnce(new ApiError(400, { errorCode: 3095, detail: 'The display name must be 1 to 100 characters.' }));
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'familyNameInvalid' });
    });

    it('reports a font removed from under the drawer', async () => {
        mocks.patch.mockRejectedValue(new ApiError(404, { errorCode: 2001, detail: 'gone' }));
        const { result } = renderDrawer(FONT);
        act(() => result.current.handleFieldChange(field('familyName', 'Didot')));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'notFound' });
    });

    it('keeps a rejected upload as an error to show, with the file still pending', async () => {
        const error = new ApiError(400, { errorCode: 3054, detail: 'missing ΐ', details: { missing: ['ΐ'] } });
        mocks.upload.mockRejectedValue(error);
        const { result } = renderDrawer(FONT);
        await act(() => result.current.handleFileChange(fileChange(woff2())));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'other', error });
        expect(result.current.hasPendingFile).toBe(true);
        expect(result.current.createdWithoutFile).toBe(false);
    });

    it('sends one create when the form is submitted twice before the first settles', async () => {
        let finish: (font: AdminThemeFontDto) => void = () => undefined;
        mocks.create.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const { result } = renderDrawer();
        fillValidDraft(result);

        await act(async () => {
            const first = result.current.handleSubmit(submitEvent());
            const second = result.current.handleSubmit(submitEvent());
            finish({ ...FONT, url: null });
            await Promise.all([first, second]);
        });

        expect(mocks.create).toHaveBeenCalledTimes(1);
    });
});

describe('useThemeFontDrawer preview', () => {
    it('loads the saved file from its same-origin url', async () => {
        const { result } = renderDrawer(FONT);
        await waitFor(() => expect(result.current.previewFamily).toMatch(/^theme-preview-\d+$/));
        expect(faces[0].source).toBe('url("/api/theme-fonts/gfs-didot/1.woff2")');
        expect(fonts.add).toHaveBeenCalledWith(faces[0]);
    });

    it('has no preview for a font without a file', () => {
        const { result } = renderDrawer({ ...FONT, url: null });
        expect(result.current.previewFamily).toBeNull();
        expect(faces).toHaveLength(0);
    });

    it('previews a picked file from its bytes, and removes the face it replaces and on unmount', async () => {
        const { result, unmount } = renderDrawer(FONT);
        await waitFor(() => expect(fonts.add).toHaveBeenCalledTimes(1));
        const savedFamily = result.current.previewFamily;

        await act(() => result.current.handleFileChange(fileChange(woff2())));
        await waitFor(() => expect(fonts.add).toHaveBeenCalledTimes(2));
        expect(faces[1].source).toBeInstanceOf(ArrayBuffer);
        expect(fonts.delete).toHaveBeenCalledWith(faces[0]);
        expect(result.current.previewFamily).not.toBe(savedFamily);

        unmount();
        expect(fonts.delete).toHaveBeenCalledWith(faces[1]);
    });

    it('says the file could not be previewed when the font fails to load', async () => {
        loadResult = () => Promise.reject(new DOMException('bad font', 'SyntaxError'));
        const { result } = renderDrawer(null);
        await act(() => result.current.handleFileChange(fileChange(woff2('broken.woff2'))));

        await waitFor(() => expect(result.current.previewFailed).toBe('file'));
        expect(result.current.previewFamily).toBeNull();
        expect(fonts.add).not.toHaveBeenCalled();
    });

    it('has no preview, and no crash, where the browser lacks FontFace', () => {
        vi.stubGlobal('FontFace', undefined);
        const { result } = renderDrawer(FONT);
        expect(result.current.previewFamily).toBeNull();
        expect(result.current.previewFailed).toBeNull();
    });
});

describe('useThemeFontDrawer review fixes', () => {
    it('skips the upload and onDoneAction when the drawer unmounts between create and upload', async () => {
        const onDoneAction = vi.fn();
        let finish: (font: AdminThemeFontDto) => void = () => undefined;
        mocks.create.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const { result, unmount } = renderDrawer(null, onDoneAction);
        fillValidDraft(result);
        await act(() => result.current.handleFileChange(fileChange(woff2())));

        let pending: Promise<void> = Promise.resolve();
        act(() => {
            pending = result.current.handleSubmit(submitEvent());
        });
        unmount();
        finish({ ...FONT, url: null });
        await pending;

        expect(mocks.create).toHaveBeenCalledOnce();
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(onDoneAction).not.toHaveBeenCalled();
    });

    it('drops the pending file when a second pick is refused', async () => {
        mocks.patch.mockResolvedValue(FONT);
        const { result } = renderDrawer(FONT);
        await act(() => result.current.handleFileChange(fileChange(woff2('a.woff2'))));
        expect(result.current.pendingFileName).toBe('a.woff2');

        await act(() => result.current.handleFileChange(fileChange(new File(['x'], 'b.ttf'))));
        expect(result.current.fileError).toBe('type');
        expect(result.current.hasPendingFile).toBe(false);
        expect(result.current.pendingFileName).toBeNull();

        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it('refetches the fonts when create says the key is taken', async () => {
        const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
        mocks.create.mockRejectedValue(new ApiError(409, { errorCode: 5146, detail: 'taken' }));
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'theme-fonts'] });
    });

    it('does not load a saved url that is not the theme font path of this font', () => {
        const { result } = renderDrawer({ ...FONT, url: 'https://evil.example/x.woff2' });
        expect(faces).toHaveLength(0);
        expect(result.current.previewFamily).toBeNull();
        cleanup();

        renderDrawer({ ...FONT, url: '/api/theme-fonts/another-font/1.woff2' });
        expect(faces).toHaveLength(0);
    });

    it('tells a saved file that failed to load apart from a bad pick, and refetches the fonts', async () => {
        const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
        loadResult = () => Promise.reject(new Error('404'));
        const { result } = renderDrawer(FONT);
        await waitFor(() => expect(result.current.previewFailed).toBe('saved'));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'theme-fonts'] });

        await act(() => result.current.handleFileChange(fileChange(woff2('broken.woff2'))));
        await waitFor(() => expect(result.current.previewFailed).toBe('file'));
    });
});

describe('useThemeFontDrawer TTF and OTF', () => {
    it('accepts a TTF by its bytes, previews it and uploads it as picked', async () => {
        mocks.upload.mockResolvedValue(FONT);
        const { result } = renderDrawer(FONT);
        await waitFor(() => expect(fonts.add).toHaveBeenCalledTimes(1));
        const file = ttf();

        await act(() => result.current.handleFileChange(fileChange(file)));
        expect(result.current.fileError).toBeNull();
        expect(result.current.pendingFileName).toBe('didot.ttf');
        await waitFor(() => expect(fonts.add).toHaveBeenCalledTimes(2));
        expect(faces[1].source).toBeInstanceOf(ArrayBuffer);

        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.upload).toHaveBeenCalledWith({ id: 'f1', file });
    });

    it('keeps the latest pick when an earlier one finishes its check later', async () => {
        const { result } = renderDrawer(FONT);
        const first = slowFile('first.woff2');

        let firstCheck: Promise<void> = Promise.resolve();
        act(() => {
            firstCheck = result.current.handleFileChange(fileChange(first.file));
        });
        await act(() => result.current.handleFileChange(fileChange(ttf('second.ttf'))));
        first.release();
        await act(() => firstCheck);

        expect(result.current.pendingFileName).toBe('second.ttf');
    });

    // 5147 (conversion unavailable) and every other 503 go to the shared copy like any other error.
    it.each([
        ['a 5147', new ApiError(503, { errorCode: 5147, detail: 'Δεν γίνεται μετατροπή τώρα.' })],
        ['a busy 5119', new ApiError(503, { errorCode: 5119, detail: 'busy', retryAfterSeconds: 5 })],
        ['a 503 without a code', new ApiError(503, { detail: 'down' })],
    ])('keeps %s from the upload as an error to show, with the file still pending', async (_label, error) => {
        mocks.upload.mockRejectedValue(error);
        const { result } = renderDrawer(FONT);
        await act(() => result.current.handleFileChange(fileChange(ttf())));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'other', error });
        expect(result.current.hasPendingFile).toBe(true);
    });

    it('leaves a 503 from create to the shared copy', async () => {
        const error = new ApiError(503, { errorCode: 5004, detail: 'down' });
        mocks.create.mockRejectedValue(error);
        const { result } = renderDrawer();
        fillValidDraft(result);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'other', error });
    });
});

describe('useThemeFontDrawer pending file check', () => {
    it('does not upload an earlier pick while a later one is still being checked', async () => {
        mocks.upload.mockResolvedValue(FONT);
        const { result } = renderDrawer(FONT);
        await act(() => result.current.handleFileChange(fileChange(woff2('a.woff2'))));
        expect(result.current.pendingFileName).toBe('a.woff2');

        const second = slowFile('b.woff2');
        let check: Promise<void> = Promise.resolve();
        act(() => {
            check = result.current.handleFileChange(fileChange(second.file));
        });
        expect(result.current.isCheckingFile).toBe(true);
        expect(result.current.hasPendingFile).toBe(false);

        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.patch).not.toHaveBeenCalled();

        second.release();
        await act(() => check);
        expect(result.current.isCheckingFile).toBe(false);
        expect(result.current.pendingFileName).toBe('b.woff2');
    });

    it('updates nothing when the drawer unmounts during a check', async () => {
        const consoleError = vi.spyOn(console, 'error');
        const { result, unmount } = renderDrawer(FONT);
        const pick = slowFile('a.woff2');
        let check: Promise<void> = Promise.resolve();
        act(() => {
            check = result.current.handleFileChange(fileChange(pick.file));
        });
        unmount();
        pick.release();
        await expect(check).resolves.toBeUndefined();
        expect(result.current.pendingFileName).toBeNull();
        expect(consoleError).not.toHaveBeenCalled();
    });
});
