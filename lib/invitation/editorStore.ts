import { applyPatches, type Draft, enablePatches, type Patch, produceWithPatches } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { ThemeDesign } from '@/lib/invitation/theme';

enablePatches();

// The old editor kept the last 50 steps.
export const EDITOR_HISTORY_LIMIT = 50;
// Edits with the same merge key this close together are one undo step (a colour being dragged).
export const EDITOR_MERGE_WINDOW_MS = 1000;

type HistoryStep = { patches: Patch[]; inversePatches: Patch[]; mergeKey?: string; at: number };

// `gesture`: the edits of one drag stay one undo step however long the pointer rests.
export type EditOptions = { gesture?: boolean };

// A theme's share image: a theme asset id, or none. Saved beside the design.
export type ThemeShare = { imageId: string | null };

// What the history covers: the document, and the theme and its share image when an admin edits one.
type Edited = { document: InvitationDocument; theme: ThemeDesign | undefined; share: ThemeShare | undefined };

export type InvitationEditorState = Edited & {
    past: HistoryStep[];
    future: HistoryStep[];
    // Goes up with every change to the document or theme, undo and redo included. Autosave compares it.
    changeCount: number;
    edit: (recipe: (draft: Draft<InvitationDocument>) => void, mergeKey?: string, options?: EditOptions) => void;
    // Only an admin's theme editor has a theme to change; elsewhere it does nothing.
    // The recipe gets the document too, for a theme change that also clears what sections chose.
    editTheme: (
        recipe: (theme: Draft<ThemeDesign>, document: Draft<InvitationDocument>, share: Draft<ThemeShare>) => void,
        mergeKey?: string,
        options?: EditOptions,
    ) => void;
    undo: () => void;
    redo: () => void;
};

export type InvitationEditorStore = StoreApi<InvitationEditorState>;

// One store per open draft or theme. Every edit is kept as Immer patches, so undo and redo
// replay exactly what changed instead of swapping whole copies of the document. Document and
// theme edits share one history, so undo steps back through both in order.
export function createInvitationEditorStore(document: InvitationDocument, theme?: ThemeDesign, share?: ThemeShare): InvitationEditorStore {
    return createStore<InvitationEditorState>()((set, get) => {
        const edited = (): Edited => ({ document: get().document, theme: get().theme, share: get().share });

        const record = (recipe: (draft: Draft<Edited>) => void, mergeKey: string | undefined, options: EditOptions | undefined) => {
            const { past, changeCount } = get();
            const [next, patches, inversePatches] = produceWithPatches(edited(), recipe);
            if (patches.length === 0) return;

            const now = Date.now();
            const last = past.at(-1);
            const merges =
                mergeKey !== undefined && last?.mergeKey === mergeKey && (options?.gesture === true || now - last.at < EDITOR_MERGE_WINDOW_MS);
            const step: HistoryStep = merges
                ? { patches: [...last.patches, ...patches], inversePatches: [...inversePatches, ...last.inversePatches], mergeKey, at: now }
                : { patches, inversePatches, mergeKey, at: now };
            const kept = merges ? past.slice(0, -1) : past;

            set({ ...next, past: [...kept, step].slice(-EDITOR_HISTORY_LIMIT), future: [], changeCount: changeCount + 1 });
        };

        return {
            document,
            theme,
            share: theme ? (share ?? { imageId: null }) : undefined,
            past: [],
            future: [],
            changeCount: 0,

            edit: (recipe, mergeKey, options) => record((draft) => recipe(draft.document), mergeKey, options),

            editTheme: (recipe, mergeKey, options) => {
                if (!get().theme) return;
                record((draft) => recipe(draft.theme as Draft<ThemeDesign>, draft.document, draft.share as Draft<ThemeShare>), mergeKey, options);
            },

            undo: () => {
                const { past, future, changeCount } = get();
                const step = past.at(-1);
                if (!step) return;
                set({
                    ...applyPatches(edited(), step.inversePatches),
                    past: past.slice(0, -1),
                    // A later edit never merges into a step that was undone and redone.
                    future: [{ ...step, mergeKey: undefined }, ...future],
                    changeCount: changeCount + 1,
                });
            },

            redo: () => {
                const { past, future, changeCount } = get();
                const step = future[0];
                if (!step) return;
                set({ ...applyPatches(edited(), step.patches), past: [...past, step], future: future.slice(1), changeCount: changeCount + 1 });
            },
        };
    });
}
