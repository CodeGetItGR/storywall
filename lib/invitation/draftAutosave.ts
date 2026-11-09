import { isLostDraftError, isStaleRevision, isTransientSaveError, sameDocument } from '@/lib/invitation/drafts';

// Saves about 1.5 s after the last change, and every 5 s while changes stay unsaved
// (someone who never stops typing, or a save that failed).
export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const AUTOSAVE_SAFETY_MS = 5000;
// A failed save is tried this many more times before the editor says it isn't saved.
export const AUTOSAVE_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

type Snapshot<D> = { document: D; changeCount: number };

export type DraftAutosaveOptions<D> = {
    revision: number;
    // What that revision holds. Left out, it is what read() returns now.
    saved?: Snapshot<D>;
    read: () => Snapshot<D>;
    save: (revision: number, document: D) => Promise<{ revision: number }>;
    // The stored copy, read when a save is refused as stale.
    loadLatest: () => Promise<{ revision: number; document: unknown }>;
    onStatus: (status: SaveStatus) => void;
    onSaved?: (revision: number, document: D) => void;
    retryDelayMs?: number;
};

export type DraftAutosave = {
    // Call after every change to the document.
    changed: () => void;
    // Saves now and waits, also for a save already on its way. True once everything is saved.
    flush: () => Promise<boolean>;
    status: () => SaveStatus;
    // Stops the timers. With save, unsaved changes are still sent, without waiting.
    dispose: (options?: { save?: boolean }) => void;
};

export function createDraftAutosave<D>(options: DraftAutosaveOptions<D>): DraftAutosave {
    const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
    const initial = options.saved ?? options.read();
    let revision = options.revision;
    let savedChangeCount = initial.changeCount;
    let savedDocument = initial.document;
    let status: SaveStatus = 'saved';
    let inFlight: Promise<boolean> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    // The draft is gone or no longer theirs: the safety timer stops trying.
    let gaveUp = false;

    // Kept up after dispose too, so a last save knows whether it may still go out.
    const setStatus = (next: SaveStatus) => {
        if (next === status) return;
        status = next;
        if (!disposed) options.onStatus(next);
    };

    const isDirty = () => options.read().changeCount !== savedChangeCount;

    const clearDebounce = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = null;
    };

    const clearTimers = () => {
        clearDebounce();
        if (safetyTimer) clearInterval(safetyTimer);
        safetyTimer = null;
    };

    const schedule = () => {
        clearDebounce();
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            void run();
        }, AUTOSAVE_DEBOUNCE_MS);
        if (!safetyTimer) safetyTimer = setInterval(() => void run(), AUTOSAVE_SAFETY_MS);
    };

    const accept = (nextRevision: number, document: D, changeCount: number) => {
        revision = nextRevision;
        savedChangeCount = changeCount;
        savedDocument = document;
        options.onSaved?.(nextRevision, document);
    };

    // Refused as stale. When the stored copy already is what was sent, it was this editor's
    // own save whose answer got lost: carry on from its revision. Anything else is newer work.
    const resolveStale = async (document: D, changeCount: number): Promise<boolean> => {
        try {
            const latest = await options.loadLatest();
            if (sameDocument(latest.document, document)) {
                accept(latest.revision, document, changeCount);
                return true;
            }
        } catch {
            setStatus('error');
            return false;
        }
        clearTimers();
        setStatus('conflict');
        return false;
    };

    const attempt = async (): Promise<boolean> => {
        const { document, changeCount } = options.read();
        if (changeCount === savedChangeCount) return true;
        // Undone back to what is stored: nothing to send.
        if (sameDocument(document, savedDocument)) {
            savedChangeCount = changeCount;
            return true;
        }

        setStatus('saving');
        for (let tries = 0; ; tries += 1) {
            try {
                const saved = await options.save(revision, document);
                accept(saved.revision, document, changeCount);
                return true;
            } catch (error) {
                if (isStaleRevision(error)) return resolveStale(document, changeCount);
                if (!isTransientSaveError(error) || tries >= AUTOSAVE_RETRIES) {
                    gaveUp = isLostDraftError(error);
                    setStatus('error');
                    return false;
                }
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (tries + 1)));
            }
        }
    };

    const settle = () => {
        if (disposed || status === 'conflict') return;
        if (!isDirty()) {
            clearTimers();
            setStatus('saved');
            return;
        }
        // A failed save is tried again by the safety timer, not straight away.
        if (status === 'error') {
            if (gaveUp) {
                if (safetyTimer) clearInterval(safetyTimer);
                safetyTimer = null;
            } else if (!safetyTimer) {
                safetyTimer = setInterval(() => void run(), AUTOSAVE_SAFETY_MS);
            }
            return;
        }
        setStatus('unsaved');
        // Changes made while the save was on its way go out on their own debounce.
        if (!debounceTimer) schedule();
    };

    // One save at a time, so this editor never races itself.
    const run = (): Promise<boolean> => {
        if (inFlight) return inFlight;
        if (status === 'conflict') return Promise.resolve(false);
        const current = attempt().then((ok) => {
            inFlight = null;
            settle();
            return ok;
        });
        inFlight = current;
        return current;
    };

    return {
        changed: () => {
            if (disposed || status === 'conflict') return;
            if (!inFlight && status !== 'error') setStatus('unsaved');
            schedule();
        },

        flush: async () => {
            clearDebounce();
            // A save already on its way sent an older copy, so go round until nothing is left.
            for (let round = 0; round < 3; round += 1) {
                if (status === 'conflict') return false;
                if (!(await run())) return false;
                if (!isDirty()) return true;
            }
            return !isDirty();
        },

        status: () => status,

        dispose: ({ save = false } = {}) => {
            clearTimers();
            disposed = true;
            if (!save) return;
            const sendLatest = () => {
                if (status !== 'conflict' && isDirty()) void attempt();
            };
            // A save on its way carries an older copy, so the latest goes out after it.
            if (inFlight) void inFlight.then(sendLatest);
            else sendLatest();
        },
    };
}
