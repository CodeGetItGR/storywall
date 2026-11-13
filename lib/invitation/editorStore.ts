import { applyPatches, type Draft, enablePatches, type Patch, produceWithPatches } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { InvitationDocument } from '@/lib/invitation/document';

enablePatches();

// The old editor kept the last 50 steps.
export const EDITOR_HISTORY_LIMIT = 50;
// Edits with the same merge key this close together are one undo step (a colour being dragged).
export const EDITOR_MERGE_WINDOW_MS = 1000;

// `theme`: the step switched the design, from one theme slug to another.
type HistoryStep = { patches: Patch[]; inversePatches: Patch[]; mergeKey?: string; at: number; theme?: { from: string; to: string } };

// `gesture`: the edits of one drag stay one undo step however long the pointer rests.
export type EditOptions = { gesture?: boolean };

export type InvitationEditorState = {
    document: InvitationDocument;
    // The slug of the theme the editor shows. Two themes can share a document themeId (a copied
    // theme keeps its source's), so the design is tracked here, with undo and redo.
    themeSlug: string;
    past: HistoryStep[];
    future: HistoryStep[];
    // Goes up with every change to the document, undo and redo included. Autosave compares it.
    changeCount: number;
    edit: (recipe: (draft: Draft<InvitationDocument>) => void, mergeKey?: string, options?: EditOptions) => void;
    // One undo step that moves the invitation to another theme and changes the document with it.
    switchTheme: (themeSlug: string, recipe: (draft: Draft<InvitationDocument>) => void) => void;
    undo: () => void;
    redo: () => void;
};

export type InvitationEditorStore = StoreApi<InvitationEditorState>;

// One store per open draft. Every edit is kept as Immer patches, so undo and redo
// replay exactly what changed instead of swapping whole copies of the document.
export function createInvitationEditorStore(document: InvitationDocument, themeSlug = ''): InvitationEditorStore {
    return createStore<InvitationEditorState>()((set, get) => ({
        document,
        themeSlug,
        past: [],
        future: [],
        changeCount: 0,

        edit: (recipe, mergeKey, options) => {
            const { document: current, past, changeCount } = get();
            const [next, patches, inversePatches] = produceWithPatches(current, recipe);
            if (patches.length === 0) return;

            const now = Date.now();
            const last = past.at(-1);
            const merges =
                mergeKey !== undefined && last?.mergeKey === mergeKey && (options?.gesture === true || now - last.at < EDITOR_MERGE_WINDOW_MS);
            const step: HistoryStep = merges
                ? { patches: [...last.patches, ...patches], inversePatches: [...inversePatches, ...last.inversePatches], mergeKey, at: now }
                : { patches, inversePatches, mergeKey, at: now };
            const kept = merges ? past.slice(0, -1) : past;

            set({ document: next, past: [...kept, step].slice(-EDITOR_HISTORY_LIMIT), future: [], changeCount: changeCount + 1 });
        },

        switchTheme: (nextSlug, recipe) => {
            const { document: current, themeSlug: currentSlug, past, changeCount } = get();
            if (nextSlug === currentSlug) return;
            const [next, patches, inversePatches] = produceWithPatches(current, recipe);
            const step: HistoryStep = { patches, inversePatches, at: Date.now(), theme: { from: currentSlug, to: nextSlug } };
            set({
                document: next,
                themeSlug: nextSlug,
                past: [...past, step].slice(-EDITOR_HISTORY_LIMIT),
                future: [],
                changeCount: changeCount + 1,
            });
        },

        undo: () => {
            const { document: current, themeSlug: currentSlug, past, future, changeCount } = get();
            const step = past.at(-1);
            if (!step) return;
            set({
                document: applyPatches(current, step.inversePatches),
                themeSlug: step.theme?.from ?? currentSlug,
                past: past.slice(0, -1),
                // A later edit never merges into a step that was undone and redone.
                future: [{ ...step, mergeKey: undefined }, ...future],
                changeCount: changeCount + 1,
            });
        },

        redo: () => {
            const { document: current, themeSlug: currentSlug, past, future, changeCount } = get();
            const step = future[0];
            if (!step) return;
            set({
                document: applyPatches(current, step.patches),
                themeSlug: step.theme?.to ?? currentSlug,
                past: [...past, step],
                future: future.slice(1),
                changeCount: changeCount + 1,
            });
        },
    }));
}
