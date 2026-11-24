'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { FeedPhotoButton } from '@/components/feed/edit/FeedPhotoButton';
import { FeedSectionColorField } from '@/components/feed/edit/FeedSectionColorField';
import { SECONDARY_BUTTON_CLASS, SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import type { FeedBackgroundKind } from '@/lib/feedBlockMenu';

type FeedSectionBackgroundSheetProps = {
    // null: closed.
    kind: FeedBackgroundKind | null;
    isDesktop: boolean;
    color: string | undefined;
    themeColors: readonly string[];
    hasPhoto: boolean;
    uploading: boolean;
    failed: boolean;
    onColor: (color: string | undefined) => void;
    onPickPhoto: (file: File) => void;
    onRemovePhoto: () => void;
    onClose: () => void;
};

// A section's own background: its colour, or its photo. Held until Save.
export function FeedSectionBackgroundSheet({
    kind,
    isDesktop,
    color,
    themeColors,
    hasPhoto,
    uploading,
    failed,
    onColor,
    onPickPhoto,
    onRemovePhoto,
    onClose,
}: FeedSectionBackgroundSheetProps) {
    const t = useTranslations('InvitationEditor.photos');
    const tRemove = useTranslations('ImageDropInput');
    const tFeed = useTranslations('FeedEditor');
    const title = kind === 'photo' ? tFeed('background.image') : tFeed('background.color');

    return (
        <FeedEditSheetFrame open={kind !== null} title={title} isDesktop={isDesktop} onClose={onClose}>
            {kind === 'photo' ? (
                <div className="flex flex-col gap-2">
                    {/* Photo */}
                    <FeedPhotoButton label={hasPhoto ? t('change') : tFeed('addPhoto')} uploading={uploading} onPick={onPickPhoto} />
                    {hasPhoto && (
                        <button type="button" onClick={onRemovePhoto} disabled={uploading} className={SECONDARY_BUTTON_CLASS}>
                            <Trash2 aria-hidden="true" />
                            {tRemove('remove')}
                        </button>
                    )}
                    {failed && <SettingsHint tone="error">{t('errors.failed')}</SettingsHint>}
                </div>
            ) : (
                <FeedSectionColorField value={color} themeColors={themeColors} label={title} onChange={onColor} />
            )}
        </FeedEditSheetFrame>
    );
}
