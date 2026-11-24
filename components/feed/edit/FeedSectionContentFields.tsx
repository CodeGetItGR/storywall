'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedPhotoButton } from '@/components/feed/edit/FeedPhotoButton';
import { SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorCircles } from '@/components/ui/color/ColorCircles';

export type FeedSectionContent = {
    // The section's text colour now.
    textColor: string;
    themeColors: readonly string[];
    uploading: boolean;
    failed: boolean;
    onPhoto: (file: File) => void;
    onTextColor: (color: string) => void;
};

// A Save my date section's settings for its content: a photo in it, and one colour for all its text.
export function FeedSectionContentFields({ textColor, themeColors, uploading, failed, onPhoto, onTextColor }: FeedSectionContent) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');
    const labelId = useId();

    return (
        <div className="flex flex-col gap-4">
            {/* Add photo */}
            <div className="flex flex-col gap-1.5">
                <FeedPhotoButton label={tFeed('addPhoto')} uploading={uploading} onPick={onPhoto} />
                {failed && <SettingsHint tone="error">{t('photos.errors.failed')}</SettingsHint>}
            </div>

            {/* Text colour */}
            <div className="flex flex-col gap-1.5">
                <span id={labelId} className="text-[13px] leading-tight">
                    {t('textColor')}
                </span>
                <ColorCircles value={textColor} themeColors={themeColors} labelledBy={labelId} onChange={onTextColor} />
            </div>
        </div>
    );
}
