'use client';

import { useTranslations } from 'next-intl';

import { FeedGalleryPlaceholder } from '@/components/feed/edit/FeedGalleryPlaceholder';
import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedPreviewSection } from '@/lib/feedSections';
import type { MediaResolver } from '@/lib/invitation/render';
import type { FeedModeSectionType } from '@/lib/invitation/sections';

type FeedModeSectionPictureProps = { event: EventDetailResponseDto; type: FeedModeSectionType; media: MediaResolver };

// A live picture of one of Feed mode's sections the host may add, on the page's own colour. Pinned photos starts with
// no photos, so it shows empty tiles. Inert: a section draws buttons of its own.
export function FeedModeSectionPicture({ event, type, media }: FeedModeSectionPictureProps) {
    const t = useTranslations('FeedSections.prompt');

    return (
        <div aria-hidden="true" inert className="pointer-events-none overflow-hidden bg-event">
            {type === 'feedPinned' ? (
                <div className="aspect-[3/1]">
                    <FeedGalleryPlaceholder />
                </div>
            ) : (
                <FeedModeSection event={event} section={feedPreviewSection(type, t('placeholder'))} media={media} />
            )}
        </div>
    );
}
