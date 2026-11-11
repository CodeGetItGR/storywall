'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import { type AdminInvitationThemeDto, isThemeRevisionStale } from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { createDraftAutosave, type DraftAutosave, type SaveStatus } from '@/lib/invitation/draftAutosave';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { type EditableTheme, type ThemeContent, themeContentRequest, type ThemeSaveMode } from '@/lib/invitation/themeEditing';

function contentOf(store: InvitationEditorStore): { document: ThemeContent; changeCount: number } {
    const { document, theme, changeCount } = store.getState();
    return { document: { design: theme ?? ({} as ThemeContent['design']), document }, changeCount };
}

// Saves an admin's theme: its design and default invitation together, naming the revision
// it was loaded at. A draft theme saves as you go; a live one only when save() is called.
export function useThemeAutosave(store: InvitationEditorStore, theme: EditableTheme, mode: ThemeSaveMode) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<SaveStatus>('saved');
    // What the editor opened with, taken on the first render (see useDraftAutosave).
    const [opened] = useState(() => ({ theme, snapshot: contentOf(store) }));
    const autosaveRef = useRef<DraftAutosave | null>(null);

    useEffect(() => {
        const { theme: loaded, snapshot } = opened;
        const path = endpoints.admin.invitationThemes.byId(loaded.id);
        const autosave = createDraftAutosave<ThemeContent>({
            revision: loaded.revision,
            saved: snapshot,
            read: () => contentOf(store),
            manual: mode === 'manual',
            isStale: isThemeRevisionStale,
            save: async (revision, content) => {
                const saved = await api.put<AdminInvitationThemeDto>(path, themeContentRequest(loaded.dto, content, revision));
                queryClient.setQueryData(adminInvitationThemeKeys.detail(loaded.id), saved);
                return saved;
            },
            loadLatest: async () => {
                const latest = await api.get<AdminInvitationThemeDto>(path);
                return { revision: latest.revision, document: { design: latest.design, document: latest.document } };
            },
            onStatus: setStatus,
        });
        autosaveRef.current = autosave;
        const unsubscribe = store.subscribe((state, previous) => {
            if (state.changeCount !== previous.changeCount) autosave.changed();
        });
        if (store.getState().changeCount !== snapshot.changeCount) autosave.changed();

        return () => {
            unsubscribe();
            // A live theme's unsaved changes stay unsent: only Save sends them.
            autosave.dispose({ save: mode === 'auto' });
            autosaveRef.current = null;
            void queryClient.invalidateQueries({ queryKey: adminInvitationThemeKeys.list() });
        };
    }, [mode, opened, queryClient, store]);

    const flush = useCallback(() => autosaveRef.current?.flush() ?? Promise.resolve(true), []);
    // Leaving a live theme never saves it: it is saved when nothing is waiting.
    const isSaved = useCallback(() => Promise.resolve((autosaveRef.current?.status() ?? 'saved') === 'saved'), []);

    return { status, flush, isSaved };
}
