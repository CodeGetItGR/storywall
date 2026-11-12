'use client';

import { useTranslations } from 'next-intl';

import { EditorNotice } from '@/components/saveMyDate/editor/EditorNotice';
import type { PublishNotice as PublishNoticeState } from '@/hooks/usePublishInvitation';

type PublishNoticeProps = {
    notice: PublishNoticeState | null;
    // Opens the published page in a new tab.
    onOpen: () => void;
};

// The line under the top bar after Publish.
export function PublishNotice({ notice, onOpen }: PublishNoticeProps) {
    const t = useTranslations('InvitationEditor');

    switch (notice?.kind) {
        case 'published':
            return <EditorNotice tone="info" message={t('published')} actionLabel={t('open')} onAction={onOpen} />;
        case 'republished':
            return <EditorNotice tone="info" message={t('republished')} />;
        case 'failed':
            return <EditorNotice tone="error" message={t('publishFailed')} />;
        default:
            return null;
    }
}
