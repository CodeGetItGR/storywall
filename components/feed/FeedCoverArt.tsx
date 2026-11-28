import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { BannerTitle } from '@/components/feed/BannerTitle';
import { ThemeArtImage } from '@/components/saveMyDate/invitation/sections/ThemeArtImage';
import type { FeedTopArt } from '@/lib/feedTopArt';
import { artAnimationClass, artImageStyle, MAIN_ART_BASE } from '@/lib/invitation/render';

type FeedCoverArtProps = { art: FeedTopArt; title: string; actions?: ReactNode; clearPill?: boolean };

// The theme's top illustration in the cover's place, straight on the page at the invitation's size, with the event's
// title under it.
export function FeedCoverArt({ art, title, actions, clearPill = false }: FeedCoverArtProps) {
    const t = useTranslations('InvitationRenderer');

    return (
        <div className="relative w-full">
            {/* Illustration */}
            <ThemeArtImage
                className={`mx-auto block ${artAnimationClass(art.animation)}`}
                src={art.src}
                alt={t('mainArtAlt')}
                style={artImageStyle(MAIN_ART_BASE, art.scale)}
            />

            {/* Buttons */}
            <div className="absolute top-0 right-2 z-20 flex flex-col items-end gap-2 p-3">{actions}</div>

            {/* Title */}
            <BannerTitle title={title} clearPill={clearPill} />
        </div>
    );
}
