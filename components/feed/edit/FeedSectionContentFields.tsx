'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedPhotoButton } from '@/components/feed/edit/FeedPhotoButton';
import { type FeedSectionBackground, FeedSectionBackgroundFields } from '@/components/feed/edit/FeedSectionBackgroundFields';
import { SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorCircles } from '@/components/ui/color/ColorCircles';

export type FeedSectionContent = {
    // The section's text colour now.
    textColor: string;
    themeColors: readonly string[];
    uploading: boolean;
    // The photo in the section didn't upload.
    failed: boolean;
    onPhoto: (file: File) => void;
    onTextColor: (color: string) => void;
    background: FeedSectionBackground;
};

// A Save my date section's settings: a photo in it, one colour for all its text, and its own background.
export function FeedSectionContentFields({ textColor, themeColors, uploading, failed, onPhoto, onTextColor, background }: FeedSectionContent) {
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

            {/* Background */}
            <FeedSectionBackgroundFields {...background} themeColors={themeColors} uploading={uploading} />
        </div>
    );
}
