'use client';

import './editor.css';

import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { EditorCanvas } from '@/components/saveMyDate/editor/EditorCanvas';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { EditorNotice } from '@/components/saveMyDate/editor/EditorNotice';
import { EditorPanelBar } from '@/components/saveMyDate/editor/EditorPanelBar';
import { EditorPanelSheet } from '@/components/saveMyDate/editor/EditorPanelSheet';
import { EditorPreview } from '@/components/saveMyDate/editor/EditorPreview';
import { EditorTopBar } from '@/components/saveMyDate/editor/EditorTopBar';
import { CanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandles';
import { SectionSettings } from '@/components/saveMyDate/editor/settings/SectionSettings';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import type { useEditorLeave } from '@/hooks/useEditorLeave';
import type { EditorWorkspace } from '@/hooks/useEditorWorkspace';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type EditorFrameProps = {
    workspace: EditorWorkspace;
    leave: ReturnType<typeof useEditorLeave>;
    isBusy: boolean;
    // Publish for a host, Save for an admin's live theme.
    primary?: ComponentProps<typeof EditorTopBar>['primary'];
    onTour?: () => void;
    // What was saved elsewhere when a save is refused as stale.
    subject: 'invitation' | 'theme';
    // Theme assets on the left, typography and settings on the right.
    assets: ReactNode;
    settings: ReactNode;
    uploadedFonts?: InvitationFontDto[];
    // Brings in the stored copy after a conflict.
    onReload: () => void;
    isReloading?: boolean;
    // Notes under the top bar, like the host's publish note.
    notice?: ReactNode;
    // Sheets and dialogs of its own, like the host's publishing and tour.
    children?: ReactNode;
};

// The editor's frame for a host's draft or an admin's theme: top bar, canvas in the middle,
// theme assets on the left and typography and settings on the right. The panels dock on wide
// screens and open as sheets on smaller ones.
export function EditorFrame({
    workspace: editor,
    leave,
    isBusy,
    primary,
    onTour,
    subject,
    assets,
    settings,
    uploadedFonts,
    onReload,
    isReloading = false,
    notice,
    children,
}: EditorFrameProps) {
    const t = useTranslations('InvitationEditor');
    const { sectionSettings } = editor;

    return (
        <div className="smd-editor flex h-full flex-col bg-(--smd-editor-panel)">
            {/* Top bar */}
            <EditorTopBar
                status={editor.status}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                isBusy={isBusy}
                onBack={leave.back}
                onUndo={editor.undo}
                onRedo={editor.redo}
                onPreview={editor.openPreview}
                primary={primary}
                onTour={onTour}
            />

            {/* Save problem */}
            {editor.status === 'error' && <EditorNotice tone="error" message={t('notSaved')} actionLabel={t('retry')} onAction={editor.retrySave} />}

            {/* Notes */}
            {notice}

            {/* Workspace */}
            <div className="flex min-h-0 flex-1">
                <EditorDockedPanel title={t('themeAssets')}>{assets}</EditorDockedPanel>
                <InlineTextEditing store={editor.store} document={editor.document} theme={editor.theme} uploadedFonts={uploadedFonts}>
                    <CanvasHandles store={editor.store}>
                        <EditorCanvas
                            document={editor.document}
                            theme={editor.theme}
                            media={editor.media}
                            uploadedFonts={uploadedFonts}
                            sections={editor.sections}
                            sectionSettings={sectionSettings.opener}
                        />
                    </CanvasHandles>
                </InlineTextEditing>
                {sectionSettings.isDocked && sectionSettings.panel ? (
                    <SectionSettings panel={sectionSettings.panel} isDocked onClose={sectionSettings.close} />
                ) : (
                    <EditorDockedPanel title={t('settings')}>{settings}</EditorDockedPanel>
                )}
            </div>

            {/* Panels on small screens */}
            <EditorPanelBar onOpen={editor.setOpenPanel} />
            <EditorPanelSheet open={editor.openPanel === 'assets'} title={t('themeAssets')} onClose={editor.closePanel}>
                {assets}
            </EditorPanelSheet>
            <EditorPanelSheet open={editor.openPanel === 'settings'} title={t('settings')} onClose={editor.closePanel}>
                {settings}
            </EditorPanelSheet>

            {/* Section settings on small screens */}
            {!sectionSettings.isDocked && <SectionSettings panel={sectionSettings.panel} isDocked={false} onClose={sectionSettings.close} />}

            {/* Preview */}
            <EditorPreview
                open={editor.isPreviewOpen}
                onClose={editor.closePreview}
                document={editor.document}
                theme={editor.theme}
                media={editor.media}
                uploadedFonts={uploadedFonts}
            />

            {children}

            {/* Dialogs */}
            <EditorConflictDialog open={editor.status === 'conflict'} isReloading={isReloading} onReload={onReload} subject={subject} />
            <EditorLeaveDialog open={leave.isConfirming} onLeave={leave.leave} onStay={leave.stay} />
        </div>
    );
}
