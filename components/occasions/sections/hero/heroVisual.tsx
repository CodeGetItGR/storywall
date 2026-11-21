import { OccasionPostCard } from '@/components/occasions/OccasionPostCard';
import { HeroFeedShot } from '@/components/occasions/sections/hero/HeroFeedShot';
import type { HeroViewProps } from '@/components/occasions/sections/hero/HeroView';
import type { OccasionHeroMedia } from '@/lib/occasions/pageMedia';

// The hero phone's feed and the two post cards beside it, from an occasion's own pictures.
export function heroVisual(hero: OccasionHeroMedia, feedAlt: string): HeroViewProps['visual'] {
    const [left, right] = hero.posts;
    return {
        feed: <HeroFeedShot alt={feedAlt} photo={hero.feed} />,
        posts: [
            <OccasionPostCard avatar={left.avatar} key="left" photo={left.photo} tilt="left" />,
            <OccasionPostCard avatar={right.avatar} key="right" photo={right.photo} tilt="right" />,
        ],
    };
}
