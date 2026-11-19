'use client';

import { ImagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { SettingsPencilButton } from '@/components/manage/settings/SettingsPencilButton';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { COVER_PHOTO_SECTION_ID } from '@/lib/manageSectionTargets';
import type { SettingsPart } from '@/lib/settingsPreview';
import { cn } from '@/lib/utils';

type SettingsCoverHeroProps = {
    coverUrl: string | null;
    label: string;
    canEdit: boolean;
    selected: boolean;
    onEditAction: (part: SettingsPart) => void;
};

// The top of the invite preview: always the cover photo, even with a theme (the theme has its own page).
// Without one, the empty box opens the cover editor.
export function SettingsCoverHero({ coverUrl, label, canEdit, selected, onEditAction }: SettingsCoverHeroProps) {
    const t = useTranslations('ManagePage');
    const tAlt = useTranslations('ImageAlt');

    function handleEdit() {
        onEditAction('cover');
    }

    return (
        <TargetedSection id={COVER_PHOTO_SECTION_ID} className={cn('relative aspect-21/9 rounded-none bg-surface-muted', selected && 'outline-2 -outline-offset-2 outline-primary')}>
            {coverUrl ? (
                <>
                    {/* Cover photo */}
                    <ProtectedImage src={coverUrl} alt={tAlt('eventCover')} fill className="object-cover" sizes="(min-width: 1024px) 420px, 100vw" />
                    {canEdit && (
                        <span className="absolute right-3 bottom-3">
                            <SettingsPencilButton label={t('sessionManagement.editNamed', { title: label })} selected={selected} onClick={handleEdit} />
                        </span>
                    )}
                </>
            ) : canEdit ? (
                // Empty cover: the whole box adds one.
                <button
                    type="button"
                    onClick={handleEdit}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-faint transition-colors hover:bg-primary-light/40 hover:text-primary/70"
                >
                    <ImagePlus className="h-7 w-7" aria-hidden="true" />
                    <span className="text-sm font-medium">{t('settings.coverPhoto.upload')}</span>
                </button>
            ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-faint">
                    <ImagePlus className="h-7 w-7" aria-hidden="true" />
                </div>
            )}
        </TargetedSection>
    );
}
