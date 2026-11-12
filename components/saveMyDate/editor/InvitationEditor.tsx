'use client';

import { EditorFrame } from '@/components/saveMyDate/editor/EditorFrame';
import { PublishEventSheet } from '@/components/saveMyDate/editor/publish/PublishEventSheet';
import { PublishNotice } from '@/components/saveMyDate/editor/publish/PublishNotice';
import { PublishPlanDialog } from '@/components/saveMyDate/editor/publish/PublishPlanDialog';
import { PublishSheet } from '@/components/saveMyDate/editor/publish/PublishSheet';
import { PublishSignInDialog } from '@/components/saveMyDate/editor/publish/PublishSignInDialog';
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

// The host's editor for one draft: the editor frame with publishing and the tour.
export function InvitationEditor({ draft, uploadedFonts, onReload, isReloading = false }: InvitationEditorProps) {
    const editor = useInvitationEditor(draft, uploadedFonts);

    return (
        <EditorFrame
            workspace={editor}
            leave={editor.leave}
            isBusy={editor.isBusy}
            primary={{ action: 'publish', onClick: editor.publishing.start }}
            onTour={editor.tour.start}
            subject="invitation"
            assets={<ThemeAssetsPanel />}
            settings={<TextColorSetting value={editor.textColor} onChange={editor.setTextColor} />}
            uploadedFonts={uploadedFonts}
            onReload={onReload}
            isReloading={isReloading}
            notice={<PublishNotice notice={editor.publishing.notice} onOpen={editor.publishing.openPublished} />}
        >
            {/* Publishing */}
            <PublishSignInDialog signIn={editor.publishing.signIn} />
            <PublishEventSheet step={editor.publishing.eventStep} draftId={draft.id} eventType={draft.eventType} document={editor.document} />
            <PublishSheet sheet={editor.publishing.sheet} inviteHost={INVITE_HOST} />
            <PublishPlanDialog
                prompt={editor.publishing.planPrompt}
                onSeePlan={editor.publishing.seePlan}
                onClose={editor.publishing.closePlanPrompt}
            />

            {/* Tour */}
            <EditorTour tour={editor.tour} />
        </EditorFrame>
    );
}
