'use client';

import { useTranslations } from 'next-intl';

import { EditorFrame } from '@/components/saveMyDate/editor/EditorFrame';
import { EditorNotice } from '@/components/saveMyDate/editor/EditorNotice';
import { PublishAddonSheet } from '@/components/saveMyDate/editor/publish/PublishAddonSheet';
import { PublishEventSheet } from '@/components/saveMyDate/editor/publish/PublishEventSheet';
import { PublishNotice } from '@/components/saveMyDate/editor/publish/PublishNotice';
import { PublishPlanDialog } from '@/components/saveMyDate/editor/publish/PublishPlanDialog';
import { PublishSheet } from '@/components/saveMyDate/editor/publish/PublishSheet';
import { PublishSignInDialog } from '@/components/saveMyDate/editor/publish/PublishSignInDialog';
import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import { ThemeSwitchDialog } from '@/components/saveMyDate/editor/theme/ThemeSwitchDialog';
import { ThemeSwitchPanel } from '@/components/saveMyDate/editor/theme/ThemeSwitchPanel';
import { ThemeSwitchSheet } from '@/components/saveMyDate/editor/theme/ThemeSwitchSheet';
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

// The host's editor for one draft: the editor frame with the design change, photo uploads,
// publishing and the tour.
export function InvitationEditor({ draft, uploadedFonts, onReload, isReloading = false }: InvitationEditorProps) {
    const t = useTranslations('InvitationEditor');
    const editor = useInvitationEditor(draft, uploadedFonts);

    const assets = (
        <div className="flex flex-col gap-4">
            {/* Design */}
            <ThemeSwitchPanel themeName={editor.themeName} onChange={editor.openThemeSwitch} />

            {/* Assets */}
            <ThemeAssetsPanel />
        </div>
    );
    const notice = (
        <>
            {/* Photo problem */}
            {editor.photos.problem && (
                <EditorNotice
                    tone="error"
                    message={t(`photos.errors.${editor.photos.problem}`)}
                    actionLabel={t('close')}
                    onAction={editor.photos.dismissProblem}
                />
            )}

            {/* Publish note */}
            <PublishNotice notice={editor.publishing.notice} onOpen={editor.publishing.openPublished} />
        </>
    );

    return (
        <EditorFrame
            workspace={editor}
            leave={editor.leave}
            isBusy={editor.isBusy}
            primary={{ action: 'publish', onClick: editor.publishing.start }}
            onTour={editor.tour.start}
            subject="invitation"
            assets={assets}
            settings={<TextColorSetting value={editor.textColor} onChange={editor.setTextColor} />}
            uploadedFonts={uploadedFonts}
            onReload={onReload}
            isReloading={isReloading}
            notice={notice}
            event={editor.event}
            fieldLinks={editor.fieldLinks}
            joinUrl={editor.joinUrl}
            photoSlots={editor.photos.slots}
            eventType={draft.eventType}
        >
            {/* Publishing */}
            <PublishSignInDialog signIn={editor.publishing.signIn} />
            <PublishSignInDialog signIn={editor.photos.signIn} title={t('photos.signInTitle')} />
            <PublishEventSheet step={editor.publishing.eventStep} draftId={draft.id} eventType={draft.eventType} document={editor.document} />
            <PublishAddonSheet step={editor.publishing.addonStep} draftId={draft.id} document={editor.document} />
            <PublishSheet sheet={editor.publishing.sheet} inviteHost={INVITE_HOST} />
            <PublishPlanDialog
                prompt={editor.publishing.planPrompt}
                onSeePlan={editor.publishing.seePlan}
                onClose={editor.publishing.closePlanPrompt}
            />

            {/* Design change */}
            <ThemeSwitchSheet
                step={editor.themeSwitch.step}
                list={editor.themeSwitch.list}
                currentSlug={editor.themeSwitch.currentSlug}
                onChoose={editor.themeSwitch.choose}
                onRetryList={editor.themeSwitch.retryList}
                onClose={editor.themeSwitch.close}
            />
            <ThemeSwitchDialog
                step={editor.themeSwitch.step}
                eventType={draft.eventType}
                onConfirm={editor.themeSwitch.confirm}
                onCancel={editor.themeSwitch.back}
            />

            {/* Tour */}
            <EditorTour tour={editor.tour} />
        </EditorFrame>
    );
}
