'use client';

import { useTranslations } from 'next-intl';

import { FeedNative } from '@/components/feed/layout/FeedLook';
import { usePhotoUploadsContext } from '@/hooks/usePhotoUploadsContext';

// Where a photo was meant to go: one photo's place, or anywhere in a section.
type FeedPhotoIssueProps = { photoKey: string; sectionId?: never } | { sectionId: string; photoKey?: never };

// Why a photo isn't on the page, next to its place. On its own light box, since a theme's page can be any colour.
export function FeedPhotoIssue({ photoKey, sectionId }: FeedPhotoIssueProps) {
    const t = useTranslations('InvitationEditor.photos.errors');
    const issue = usePhotoUploadsContext()?.issue;
    if (!issue || (photoKey ? issue.key !== photoKey : issue.sectionId !== sectionId)) return null;

    return (
        <FeedNative className="contents font-sans">
            <div
                role="alert"
                className="mx-auto mb-3 w-fit max-w-full rounded-xl bg-white px-3 py-2 text-center text-[13px] text-destructive shadow-sm"
            >
                {t(issue.problem)}
            </div>
        </FeedNative>
    );
}
