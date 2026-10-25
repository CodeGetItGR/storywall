import { occasionFeatureIcon } from '@/lib/occasions/occasionFeatures';

const icon = (name: string) => `/landing/wedding/icons/${name}.webp`;

// The design's order. occasionFeatureKeys() decides which of them the page shows.
export const WEDDING_FEATURE_ORDER = [
    'invitation',
    'rsvp',
    'gallery',
    'posts',
    'stories',
    'playlist',
    'schedule',
    'wishbook',
    'wishlist',
    'quiz_polls',
] as const;

const WEDDING_FEATURE_ICONS: Record<string, string> = {
    invitation: icon('invitation'),
    rsvp: icon('rsvp'),
    gallery: icon('gallery'),
    posts: icon('posts'),
    stories: icon('stories'),
    playlist: icon('playlist'),
    schedule: icon('schedule'),
    wishbook: icon('wishbook'),
    wishlist: icon('wishlist'),
    quiz_polls: icon('roles'),
};

// The four "private social" cards, in order.
export const WEDDING_PRIVATE_ICONS = [icon('invitation'), icon('manage'), icon('roles'), icon('download')] as const;

// The offered features in the design's order. One the design has no slot for goes last, with the
// generic icon.
export function weddingFeatures(offered: readonly string[]): { key: string; icon: string }[] {
    const order = (key: string) => {
        const index = (WEDDING_FEATURE_ORDER as readonly string[]).indexOf(key);
        return index < 0 ? WEDDING_FEATURE_ORDER.length : index;
    };
    return [...offered]
        .sort((left, right) => order(left) - order(right))
        .map((key) => ({ key, icon: WEDDING_FEATURE_ICONS[key] ?? occasionFeatureIcon(key) }));
}
