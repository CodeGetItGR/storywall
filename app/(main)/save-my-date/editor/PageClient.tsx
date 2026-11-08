'use client';

import { InvitationEditorError, InvitationEditorLoading } from '@/components/saveMyDate/editor/InvitationEditorStatus';
import { useStartInvitationDraft } from '@/hooks/useStartInvitationDraft';

type StartInvitationDraftPageProps = { themeSlug: string };

export default function StartInvitationDraftPage({ themeSlug }: StartInvitationDraftPageProps) {
    const { isError, retry } = useStartInvitationDraft(themeSlug);

    return isError ? <InvitationEditorError onRetry={retry} /> : <InvitationEditorLoading />;
}
