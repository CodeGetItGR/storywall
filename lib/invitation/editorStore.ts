import { applyPatches, type Draft, enablePatches, type Patch, produceWithPatches } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { InvitationDocument } from '@/lib/invitation/document';
import { takeOverEditedFields } from '@/lib/invitation/eventLinks';

enablePatches();

// The old editor kept the last 50 steps.
export const EDITOR_HISTORY_LIMIT = 50;
// Edits with the same merge key this close together are one undo step (a colour being dragged).
export const EDITOR_MERGE_WINDOW_MS = 1000;

type HistoryStep = { patches: Patch[]; inversePatches: Patch[]; mergeKey?: string; at: number };

// `gesture`: the edits of one drag stay one undo step however long the pointer rests.
export type EditOptions = { gesture?: boolean };

export type InvitationEditorState = {
    document: InvitationDocument;
    past: HistoryStep[];
    future: HistoryStep[];
    // Goes up with every change to the document, undo and redo included. Autosave compares it.
    changeCount: number;
    edit: (recipe: (draft: Draft<InvitationDocument>) => void, mergeKey?: string, options?: EditOptions) => void;
    // A change the host didn't make (the event's data written into the fields that follow it): saved, but not an
    // undo step, and it never takes a field over.
    sync: (recipe: (draft: Draft<InvitationDocument>) => void) => void;
    undo: () => void;
    redo: () => void;
};

export type InvitationEditorStore = StoreApi<InvitationEditorState>;

// One store per open draft. Every edit is kept as Immer patches, so undo and redo
// replay exactly what changed instead of swapping whole copies of the document.
export function createInvitationEditorStore(document: InvitationDocument): InvitationEditorStore {
    return createStore<InvitationEditorState>()((set, get) => ({
        document,
        past: [],
        future: [],
        changeCount: 0,

        edit: (recipe, mergeKey, options) => {
            const { document: current, past, changeCount } = get();
            const [next, patches, inversePatches] = produceWithPatches(current, (draft) => {
                recipe(draft);
                // A field that followed the event and was edited is the invitation's own now (KAN-84).
                takeOverEditedFields(current, draft);
            });
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

        sync: (recipe) => {
            const { document: current, changeCount } = get();
            const [next, patches] = produceWithPatches(current, recipe);
            if (patches.length === 0) return;
            set({ document: next, changeCount: changeCount + 1 });
        },

        undo: () => {
            const { document: current, past, future, changeCount } = get();
            const step = past.at(-1);
            if (!step) return;
            set({
                document: applyPatches(current, step.inversePatches),
                past: past.slice(0, -1),
                // A later edit never merges into a step that was undone and redone.
                future: [{ ...step, mergeKey: undefined }, ...future],
                changeCount: changeCount + 1,
            });
        },

        redo: () => {
            const { document: current, past, future, changeCount } = get();
            const step = future[0];
            if (!step) return;
            set({ document: applyPatches(current, step.patches), past: [...past, step], future: future.slice(1), changeCount: changeCount + 1 });
        },
    }));
}
