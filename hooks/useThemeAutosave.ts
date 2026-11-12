'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminInvitationThemeKeys } from '@/hooks/useAdminInvitationThemes';
import { type AdminInvitationThemeDto, isThemeRevisionStale } from '@/lib/adminInvitationThemes';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { createDraftAutosave, type DraftAutosave, type SaveStatus } from '@/lib/invitation/draftAutosave';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { referencedAssetIds } from '@/lib/invitation/themeAssets';
import { type EditableTheme, type ThemeContent, themeContentRequest, type ThemeSaveMode } from '@/lib/invitation/themeEditing';

function contentOf(store: InvitationEditorStore): { document: ThemeContent; changeCount: number } {
    const { document, theme, share, changeCount } = store.getState();
    return { document: { design: theme ?? ({} as ThemeContent['design']), document, shareImageId: share?.imageId ?? null }, changeCount };
}

// Saves an admin's theme: its design and default invitation together, naming the revision
// it was loaded at. A draft theme saves as you go; a live one only when save() is called.
export function useThemeAutosave(store: InvitationEditorStore, theme: EditableTheme, mode: ThemeSaveMode) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<SaveStatus>('saved');
    // What the editor opened with, taken on the first render (see useDraftAutosave).
    const [opened] = useState(() => ({ theme, snapshot: contentOf(store) }));
    const autosaveRef = useRef<DraftAutosave | null>(null);
    // Images the admin took out of the theme. Their files go once a save no longer uses them.
    const removedRef = useRef(new Set<string>());

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
                deleteUnused(loaded.id, removedRef.current, content, saved);
                return saved;
            },
            loadLatest: async () => {
                const latest = await api.get<AdminInvitationThemeDto>(path);
                return { revision: latest.revision, document: { design: latest.design, document: latest.document, shareImageId: latest.ogImageAssetId } };
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

    const markRemoved = useCallback((assetId: string) => removedRef.current.add(assetId), []);
    const flush = useCallback(() => autosaveRef.current?.flush() ?? Promise.resolve(true), []);
    // Leaving a live theme never saves it: it is saved when nothing is waiting.
    const isSaved = useCallback(() => Promise.resolve((autosaveRef.current?.status() ?? 'saved') === 'saved'), []);

    return { status, flush, isSaved, markRemoved };
}

// Deletes the files of removed images the saved theme no longer uses. The backend keeps one
// that a published invitation still shows; that refusal, or any other, is left alone.
function deleteUnused(themeId: string, removed: Set<string>, content: ThemeContent, saved: AdminInvitationThemeDto) {
    const used = referencedAssetIds(content.design, content.document, content.shareImageId);
    if (saved.cardThumbAssetId) used.add(saved.cardThumbAssetId);
    for (const photo of saved.productPhotos) used.add(photo.mediaId);
    for (const assetId of [...removed]) {
        if (used.has(assetId)) continue;
        removed.delete(assetId);
        api.del(endpoints.admin.invitationThemes.asset(themeId, assetId)).catch(() => undefined);
    }
}
