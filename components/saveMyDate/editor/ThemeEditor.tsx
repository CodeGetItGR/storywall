'use client';

import { EditorFrame } from '@/components/saveMyDate/editor/EditorFrame';
import { ThemeAssetsPanel } from '@/components/saveMyDate/editor/ThemeAssetsPanel';
import { ThemeStylePanel } from '@/components/saveMyDate/editor/themeStyle/ThemeStylePanel';
import { useThemeEditor } from '@/hooks/useThemeEditor';
import type { EditableTheme } from '@/lib/invitation/themeEditing';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type ThemeEditorProps = {
    theme: EditableTheme;
    uploadedFonts?: InvitationFontDto[];
    // Brings in the stored copy after a conflict.
    onReload: () => void;
    isReloading?: boolean;
};

// An admin's editor for one theme: its default invitation in the editor frame, with the
// theme's style on the right. No publishing and no tour.
export function ThemeEditor({ theme, uploadedFonts, onReload, isReloading = false }: ThemeEditorProps) {
    const editor = useThemeEditor(theme, uploadedFonts);

    return (
        <EditorFrame
            workspace={editor}
            leave={editor.leave}
            isBusy={editor.isBusy}
            primary={editor.save}
            subject="theme"
            assets={<ThemeAssetsPanel />}
            settings={<ThemeStylePanel style={editor.style} />}
            uploadedFonts={uploadedFonts}
            onReload={onReload}
            isReloading={isReloading}
        />
    );
}
