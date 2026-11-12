'use client';

import { useCallback, useMemo } from 'react';

import { useEditorLeave } from '@/hooks/useEditorLeave';
import { useEditorWorkspace } from '@/hooks/useEditorWorkspace';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useThemeAssets } from '@/hooks/useThemeAssets';
import { useThemeAutosave } from '@/hooks/useThemeAutosave';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import { themeImageUploader } from '@/lib/invitation/editorUploads';
import { type EditableTheme, themeSaveMode } from '@/lib/invitation/themeEditing';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import { routes } from '@/lib/routes';

// Everything the admin's theme editor shows and does (KAN-68): the host's editor over the
// theme's default invitation, with the theme's style, saved to the theme.
export function useThemeEditor(theme: EditableTheme, uploadedFonts?: InvitationFontDto[]) {
    const editor = useInvitationEditorStore(theme.document, theme.design, { imageId: theme.dto.ogImageAssetId });
    const mode = themeSaveMode(theme.status);
    const { status, flush, isSaved, markRemoved } = useThemeAutosave(editor.store, theme, mode);
    const leave = useEditorLeave(mode === 'auto' ? flush : isSaved, routes.saveMyDateAdmin.themes);
    // The store always holds the theme here: it was created with one.
    const design = editor.theme ?? theme.design;
    const source = useMemo(() => ({ theme: design, media: theme.media, uploadImage: themeImageUploader(theme.id) }), [design, theme]);
    const workspace = useEditorWorkspace({ editor, eventType: theme.eventType, source, uploadedFonts, status, flush, previewSavesFirst: false });
    const style = useThemeStyle({ store: editor.store, design, document: editor.document, eventType: theme.eventType, uploadedFonts });
    const assets = useThemeAssets({
        store: editor.store,
        design,
        share: editor.share ?? { imageId: null },
        uploadImage: source.uploadImage,
        addUploaded: workspace.addUploaded,
        markRemoved,
    });
    const save = useCallback(() => void flush(), [flush]);

    return {
        ...workspace,
        mode,
        style,
        assets,
        share: editor.share ?? { imageId: null },
        leave,
        // A live theme waits for Save; a draft theme has nothing to press.
        save: mode === 'manual' ? { action: 'save' as const, onClick: save, disabled: status === 'saved' || status === 'saving' } : undefined,
        isBusy: workspace.isSaving || leave.isLeaving,
    };
}
