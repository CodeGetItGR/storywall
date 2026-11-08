'use client';

import './editor.css';

import { useTranslations } from 'next-intl';

import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { EditorNotice } from '@/components/saveMyDate/editor/EditorNotice';
import { EditorPanelBar } from '@/components/saveMyDate/editor/EditorPanelBar';
import { EditorPanelSheet } from '@/components/saveMyDate/editor/EditorPanelSheet';
import { EditorPreview } from '@/components/saveMyDate/editor/EditorPreview';
import { EditorTopBar } from '@/components/saveMyDate/editor/EditorTopBar';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import { ThemeAssetsPanel } from '@/components/saveMyDate/editor/ThemeAssetsPanel';
import { useInvitationEditor } from '@/hooks/useInvitationEditor';
import type { EditableDraft } from '@/lib/invitation/drafts';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type InvitationEditorProps = {
    draft: EditableDraft;
    uploadedFonts?: InvitationFontDto[];
    // Brings in the stored copy after a conflict.
    onReload: () => void;
    isReloading?: boolean;
};

// The editor for one draft: top bar, canvas in the middle, theme assets on the left and
// typography and settings on the right. The panels dock on wide screens and open as sheets on smaller ones.
export function InvitationEditor({ draft, uploadedFonts, onReload, isReloading = false }: InvitationEditorProps) {
    const t = useTranslations('InvitationEditor');
    const editor = useInvitationEditor(draft);

    const assets = <ThemeAssetsPanel />;
    const settings = <TextColorSetting value={editor.textColor} onChange={editor.setTextColor} />;

    return (
        <div className="smd-editor flex h-full flex-col bg-(--smd-editor-panel)">
            {/* Top bar */}
            <EditorTopBar
                status={editor.status}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                isBusy={editor.isBusy}
                onBack={editor.leave.back}
                onUndo={editor.undo}
                onRedo={editor.redo}
                onPreview={editor.openPreview}
                onPublish={editor.publish}
            />

            {/* Save problem */}
            {editor.status === 'error' && <EditorNotice tone="error" message={t('notSaved')} actionLabel={t('retry')} onAction={editor.retrySave} />}

            {/* Publish note */}
            {editor.isPublishNoticeShown && <EditorNotice tone="info" message={t('publishUnavailable')} />}

            {/* Workspace */}
            <div className="flex min-h-0 flex-1">
                <EditorDockedPanel title={t('themeAssets')}>{assets}</EditorDockedPanel>
                <EditorCanvas document={editor.document} theme={editor.theme} media={editor.media} uploadedFonts={uploadedFonts} />
                <EditorDockedPanel title={t('settings')}>{settings}</EditorDockedPanel>
            </div>

            {/* Panels on small screens */}
            <EditorPanelBar onOpen={editor.setOpenPanel} />
            <EditorPanelSheet open={editor.openPanel === 'assets'} title={t('themeAssets')} onClose={editor.closePanel}>
                {assets}
            </EditorPanelSheet>
            <EditorPanelSheet open={editor.openPanel === 'settings'} title={t('settings')} onClose={editor.closePanel}>
                {settings}
            </EditorPanelSheet>

            {/* Preview */}
            <EditorPreview
                open={editor.isPreviewOpen}
                onClose={editor.closePreview}
                document={editor.document}
                theme={editor.theme}
                media={editor.media}
                uploadedFonts={uploadedFonts}
            />

            {/* Dialogs */}
            <EditorConflictDialog open={editor.status === 'conflict'} isReloading={isReloading} onReload={onReload} />
            <EditorLeaveDialog open={editor.leave.isConfirming} onLeave={editor.leave.leave} onStay={editor.leave.stay} />
        </div>
    );
}
