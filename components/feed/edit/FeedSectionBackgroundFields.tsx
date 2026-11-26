'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedPhotoButton } from '@/components/feed/edit/FeedPhotoButton';
import { FeedSectionColorField } from '@/components/feed/edit/FeedSectionColorField';
import { SECONDARY_BUTTON_CLASS, SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';

export type FeedSectionBackground = {
    color: string | undefined;
    hasPhoto: boolean;
    // The background photo didn't upload.
    failed: boolean;
    onColor: (color: string | undefined) => void;
    onPickPhoto: (file: File) => void;
    onRemovePhoto: () => void;
};

type FeedSectionBackgroundFieldsProps = FeedSectionBackground & { themeColors: readonly string[]; uploading: boolean };

const LABEL = 'text-[13px] leading-tight';

// A Save my date section's own background: its photo, and its colour. Held until Save.
export function FeedSectionBackgroundFields({
    color,
    themeColors,
    hasPhoto,
    uploading,
    failed,
    onColor,
    onPickPhoto,
    onRemovePhoto,
}: FeedSectionBackgroundFieldsProps) {
    const t = useTranslations('InvitationEditor.photos');
    const tRemove = useTranslations('ImageDropInput');
    const tFeed = useTranslations('FeedEditor');
    const photoId = useId();
    const colorId = useId();

    return (
        <>
            {/* Background photo */}
            <div role="group" aria-labelledby={photoId} className="flex flex-col gap-1.5">
                <span id={photoId} className={LABEL}>
                    {tFeed('background.image')}
                </span>
                <FeedPhotoButton label={hasPhoto ? t('change') : tFeed('addPhoto')} uploading={uploading} onPick={onPickPhoto} />
                {hasPhoto && (
                    <button type="button" onClick={onRemovePhoto} disabled={uploading} className={SECONDARY_BUTTON_CLASS}>
                        <Trash2 aria-hidden="true" />
                        {tRemove('remove')}
                    </button>
                )}
                {failed && <SettingsHint tone="error">{t('errors.failed')}</SettingsHint>}
            </div>

            {/* Background colour */}
            <div className="flex flex-col gap-1.5">
                <span id={colorId} className={LABEL}>
                    {tFeed('background.color')}
                </span>
                <FeedSectionColorField value={color} themeColors={themeColors} labelledBy={colorId} onChange={onColor} />
            </div>
        </>
    );
}
