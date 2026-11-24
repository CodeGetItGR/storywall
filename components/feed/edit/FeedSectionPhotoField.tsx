'use client';

import { useTranslations } from 'next-intl';

import { FeedPhotoButton } from '@/components/feed/edit/FeedPhotoButton';
import { SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';

type FeedSectionPhotoFieldProps = {
    uploading: boolean;
    // The photo didn't upload.
    failed: boolean;
    onPhoto: (file: File) => void;
};

// Adds a photo in a Save my date section.
export function FeedSectionPhotoField({ uploading, failed, onPhoto }: FeedSectionPhotoFieldProps) {
    const t = useTranslations('InvitationEditor.photos.errors');
    const tFeed = useTranslations('FeedEditor');

    return (
        <div className="flex flex-col gap-1.5">
            <FeedPhotoButton label={tFeed('addPhoto')} uploading={uploading} onPick={onPhoto} />
            {failed && <SettingsHint tone="error">{t('failed')}</SettingsHint>}
        </div>
    );
}
