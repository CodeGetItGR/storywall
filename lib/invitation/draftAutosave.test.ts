import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_SAFETY_MS, createDraftAutosave, type SaveStatus } from '@/lib/invitation/draftAutosave';
import { DRAFT_REVISION_STALE_ERROR_CODE } from '@/lib/invitation/drafts';

type Doc = { text: string };

const stale = () => new ApiError(409, { errorCode: DRAFT_REVISION_STALE_ERROR_CODE });

// A document that changes like the editor store's: every change bumps the count.
function setup({
    save,
    loadLatest,
}: {
    save?: (revision: number, document: Doc) => Promise<{ revision: number }>;
    loadLatest?: () => Promise<{ revision: number; document: unknown }>;
} = {}) {
    let current: Doc = { text: 'a' };
    let changeCount = 0;
    const statuses: SaveStatus[] = [];
    const saveMock = vi.fn(save ?? (async (revision: number) => ({ revision: revision + 1 })));
    const loadMock = vi.fn(loadLatest ?? (async () => ({ revision: 0, document: { text: 'other device' } })));
    const onSaved = vi.fn();
    const autosave = createDraftAutosave<Doc>({
        revision: 1,
        read: () => ({ document: current, changeCount }),
        save: saveMock,
        loadLatest: loadMock,
        onStatus: (status) => statuses.push(status),
        onSaved,
        retryDelayMs: 10,
    });
    const change = (text: string) => {
        current = { text };
        changeCount += 1;
        autosave.changed();
    };
    return { autosave, change, save: saveMock, loadLatest: loadMock, onSaved, statuses };
}

describe('createDraftAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('saves once, 1.5 s after the last change', async () => {
        const { change, save, autosave } = setup();
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS - 100);
        change('c');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS - 100);
        expect(save).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(100);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith(1, { text: 'c' });
        expect(autosave.status()).toBe('saved');
    });

    it('reports unsaved, saving, then saved', async () => {
        const { change, statuses } = setup();
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(statuses).toEqual(['unsaved', 'saving', 'saved']);
    });

    it('saves every 5 s while changes keep coming', async () => {
        const { change, save } = setup();
        for (let elapsed = 0; elapsed < AUTOSAVE_SAFETY_MS; elapsed += 1000) {
            change(`t${elapsed}`);
            await vi.advanceTimersByTimeAsync(1000);
        }
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('names the revision the last save answered with', async () => {
        const { change, save } = setup();
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        change('c');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(save.mock.calls.map(([revision]) => revision)).toEqual([1, 2]);
    });

    it('sends nothing when the changes were undone back to what is stored', async () => {
        const { change, save, autosave } = setup();
        change('b');
        change('a');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(save).not.toHaveBeenCalled();
        expect(autosave.status()).toBe('saved');
    });

    it('keeps one save at a time and sends what changed meanwhile after it', async () => {
        let finish: (value: { revision: number }) => void = () => {};
        const { change, save, autosave } = setup({
            save: vi
                .fn<(revision: number, document: Doc) => Promise<{ revision: number }>>()
                .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
                .mockImplementation(async (revision) => ({ revision: revision + 1 })),
        });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        change('c');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS);
        expect(save).toHaveBeenCalledTimes(1);

        finish({ revision: 2 });
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(save).toHaveBeenCalledTimes(2);
        expect(save).toHaveBeenLastCalledWith(2, { text: 'c' });
        expect(autosave.status()).toBe('saved');
    });

    it('flush saves straight away and waits for it', async () => {
        const { change, save, autosave } = setup();
        change('b');
        await expect(autosave.flush()).resolves.toBe(true);
        expect(save).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('flush waits for a save already on its way, then sends the newer copy', async () => {
        let finish: (value: { revision: number }) => void = () => {};
        const { change, save, autosave } = setup({
            save: vi
                .fn<(revision: number, document: Doc) => Promise<{ revision: number }>>()
                .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
                .mockImplementation(async (revision) => ({ revision: revision + 1 })),
        });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        change('c');
        const flushed = autosave.flush();
        finish({ revision: 2 });
        await expect(flushed).resolves.toBe(true);
        expect(save).toHaveBeenLastCalledWith(2, { text: 'c' });
    });

    it('flush with nothing to save is true at once', async () => {
        const { autosave, save } = setup();
        await expect(autosave.flush()).resolves.toBe(true);
        expect(save).not.toHaveBeenCalled();
    });

    it('tries a failed save twice more before saying it is not saved', async () => {
        const { change, save, autosave } = setup({ save: async () => Promise.reject(new ApiError(503, null)) });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 100);
        expect(save).toHaveBeenCalledTimes(3);
        expect(autosave.status()).toBe('error');
    });

    it('does not retry a refused save, and tries again every 5 s', async () => {
        const { change, save, autosave } = setup({ save: async () => Promise.reject(new ApiError(400, null)) });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(save).toHaveBeenCalledTimes(1);
        expect(autosave.status()).toBe('error');

        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS);
        expect(save).toHaveBeenCalledTimes(2);
    });

    it('clears the error once a save goes through', async () => {
        const { change, autosave } = setup({
            save: vi
                .fn<(revision: number, document: Doc) => Promise<{ revision: number }>>()
                .mockRejectedValueOnce(new ApiError(400, null))
                .mockResolvedValue({ revision: 2 }),
        });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(autosave.status()).toBe('error');
        await expect(autosave.flush()).resolves.toBe(true);
        expect(autosave.status()).toBe('saved');
    });

    it('stops and reports a conflict when newer work is stored', async () => {
        const { change, save, autosave, loadLatest } = setup({ save: async () => Promise.reject(stale()) });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(loadLatest).toHaveBeenCalledTimes(1);
        expect(autosave.status()).toBe('conflict');

        change('c');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS * 2);
        expect(save).toHaveBeenCalledTimes(1);
        await expect(autosave.flush()).resolves.toBe(false);
    });

    it('is no conflict when the stored copy is its own save whose answer got lost', async () => {
        const { change, save, autosave, onSaved } = setup({
            save: vi
                .fn<(revision: number, document: Doc) => Promise<{ revision: number }>>()
                .mockRejectedValueOnce(stale())
                .mockImplementation(async (revision) => ({ revision: revision + 1 })),
            loadLatest: async () => ({ revision: 7, document: { text: 'b' } }),
        });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(autosave.status()).toBe('saved');
        expect(onSaved).toHaveBeenCalledWith(7, { text: 'b' });

        change('c');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(save).toHaveBeenLastCalledWith(7, { text: 'c' });
    });

    it('reports an error when the stored copy cannot be read after a stale save', async () => {
        const { change, autosave } = setup({
            save: async () => Promise.reject(stale()),
            loadLatest: async () => Promise.reject(new ApiError(503, null)),
        });
        change('b');
        await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
        expect(autosave.status()).toBe('error');
    });

    it('sends unsaved changes when disposed with save, and schedules nothing after', async () => {
        const { change, save, autosave } = setup();
        change('b');
        autosave.dispose({ save: true });
        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS * 2);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it('saves a change made before it started, against the copy it was given', async () => {
        const save = vi.fn(async (revision: number) => ({ revision: revision + 1 }));
        const autosave = createDraftAutosave<Doc>({
            revision: 1,
            saved: { document: { text: 'a' }, changeCount: 0 },
            read: () => ({ document: { text: 'b' }, changeCount: 1 }),
            save,
            loadLatest: async () => ({ revision: 1, document: { text: 'a' } }),
            onStatus: () => {},
        });

        expect(await autosave.flush()).toBe(true);
        expect(save).toHaveBeenCalledWith(1, { text: 'b' });
    });

    it('sends nothing when disposed without save', async () => {
        const { change, save, autosave } = setup();
        change('b');
        autosave.dispose();
        await vi.advanceTimersByTimeAsync(AUTOSAVE_SAFETY_MS * 2);
        expect(save).not.toHaveBeenCalled();
    });
});
