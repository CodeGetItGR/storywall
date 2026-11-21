import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LANDING_HERO_FEED_SIZES } from '@/lib/landingHero';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

// An occasion's own feed screenshot, scrolling in the hero phone like the landing's.
export function HeroFeedShot({ alt, photo }: { alt: string; photo: OccasionPhoto }) {
    return (
        <ProtectedImage
            alt={alt}
            className="relative block h-auto w-full max-w-none"
            // The first thing the page paints, so it loads at once.
            fetchPriority="high"
            height={photo.height}
            loading="eager"
            sizes={LANDING_HERO_FEED_SIZES}
            src={photo.src}
            width={photo.width}
        />
    );
}
