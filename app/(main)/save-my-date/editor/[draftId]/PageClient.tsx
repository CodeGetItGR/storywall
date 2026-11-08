'use client';

import { InvitationEditor } from '@/components/saveMyDate/editor/InvitationEditor';
import { InvitationEditorError, InvitationEditorLoading } from '@/components/saveMyDate/editor/InvitationEditorStatus';
import { useInvitationDraft } from '@/hooks/useInvitationDraft';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type InvitationEditorPageProps = { draftId: string; uploadedFonts?: InvitationFontDto[] };

export default function InvitationEditorPage({ draftId, uploadedFonts }: InvitationEditorPageProps) {
    const { draft, isError, loadId, isReloading, retry, reload } = useInvitationDraft(draftId);

    if (draft) return <InvitationEditor key={loadId} draft={draft} uploadedFonts={uploadedFonts} onReload={reload} isReloading={isReloading} />;
    if (isError) return <InvitationEditorError onRetry={retry} />;
    return <InvitationEditorLoading />;
}
