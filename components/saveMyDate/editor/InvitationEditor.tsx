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
import { PublishEventSheet } from '@/components/saveMyDate/editor/publish/PublishEventSheet';
import { PublishNotice } from '@/components/saveMyDate/editor/publish/PublishNotice';
import { PublishPlanDialog } from '@/components/saveMyDate/editor/publish/PublishPlanDialog';
import { PublishSheet } from '@/components/saveMyDate/editor/publish/PublishSheet';
import { PublishSignInDialog } from '@/components/saveMyDate/editor/publish/PublishSignInDialog';
import { SectionSettings } from '@/components/saveMyDate/editor/settings/SectionSettings';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import { ThemeAssetsPanel } from '@/components/saveMyDate/editor/ThemeAssetsPanel';
import { EditorTour } from '@/components/saveMyDate/editor/tour/EditorTour';
import { useInvitationEditor } from '@/hooks/useInvitationEditor';
import type { EditableDraft } from '@/lib/invitation/drafts';
import { inviteHostFor } from '@/lib/invitation/publication';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import { SITE_URL } from '@/lib/seo';

const INVITE_HOST = inviteHostFor(SITE_URL);

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
    const editor = useInvitationEditor(draft, uploadedFonts);
    const { sectionSettings } = editor;

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
                onPublish={editor.publishing.start}
                onTour={editor.tour.start}
            />

            {/* Save problem */}
            {editor.status === 'error' && <EditorNotice tone="error" message={t('notSaved')} actionLabel={t('retry')} onAction={editor.retrySave} />}

            {/* Publish note */}
            <PublishNotice notice={editor.publishing.notice} onOpen={editor.publishing.openPublished} />

            {/* Workspace */}
            <div className="flex min-h-0 flex-1">
                <EditorDockedPanel title={t('themeAssets')}>{assets}</EditorDockedPanel>
                <InlineTextEditing store={editor.store} document={editor.document} theme={editor.theme} uploadedFonts={uploadedFonts}>
                    <EditorCanvas
                        document={editor.document}
                        theme={editor.theme}
                        media={editor.media}
                        uploadedFonts={uploadedFonts}
                        sections={editor.sections}
                        sectionSettings={sectionSettings.opener}
                    />
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

            {/* Publishing */}
            <PublishSignInDialog signIn={editor.publishing.signIn} />
            <PublishEventSheet step={editor.publishing.eventStep} draftId={draft.id} eventType={draft.eventType} document={editor.document} />
            <PublishSheet sheet={editor.publishing.sheet} inviteHost={INVITE_HOST} />
            <PublishPlanDialog
                prompt={editor.publishing.planPrompt}
                onSeePlan={editor.publishing.seePlan}
                onClose={editor.publishing.closePlanPrompt}
            />

            {/* Dialogs */}
            <EditorConflictDialog open={editor.status === 'conflict'} isReloading={isReloading} onReload={onReload} />
            <EditorLeaveDialog open={editor.leave.isConfirming} onLeave={editor.leave.leave} onStay={editor.leave.stay} />

            {/* Tour */}
            <EditorTour tour={editor.tour} />
        </div>
    );
}
