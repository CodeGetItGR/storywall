import type { EventTypeConvention } from '@/lib/api/types';
import type { LandingImageAsset } from '@/lib/landingMedia';

// A piece of the app floating over a photo. Decorative: always alt="".
// Only sharp cutouts belong here; the landing's blurred depth layers read as smudges in the foreground.
export type OccasionFloat = LandingImageAsset & {
    // Position and width, as Tailwind classes, inside the photo's frame.
    className: string;
    motion: 'card' | 'comment' | 'emoji';
};

// One moment of the story: a photo, or a gallery of photos, with app pieces over it.
export type OccasionMomentMedia = { floats: OccasionFloat[]; gallery: LandingImageAsset[] } | { floats: OccasionFloat[]; photo: LandingImageAsset };

// `cover` crops to the frame; `position` picks which part of a tall screenshot stays in view.
export type OccasionFeatureImage = LandingImageAsset & { position?: 'top' | 'bottom' };

type OccasionMedia = {
    heroFloats: OccasionFloat[];
    // Before, on the day, after: same order as the timeline copy.
    moments: [OccasionMomentMedia, OccasionMomentMedia, OccasionMomentMedia];
    featureImages: Partial<Record<string, OccasionFeatureImage>>;
    finalImage: LandingImageAsset;
};

const asset = (name: string, width: number, height: number): LandingImageAsset => ({ src: `/landing/${name}.webp`, width, height });

const INVITATION_PHOTO = asset('guest-viewing-the-storywall-invitation-on-a-phone', 700, 875);
const QR_PHOTO = asset('guest-scanning-the-storywall-qr-code', 700, 875);
const RSVP_PHOTO = asset('guest-confirming-the-storywall-rsvp', 700, 875);
const WISH_PHOTO = asset('guest-sharing-a-wish-in-the-storywall-guestbook', 700, 875);

const COMMENT = asset('sw-scene-item-sw-comment-1', 705, 360);
const COMMENT_2 = asset('sw-scene-item-sw-comment-2', 557, 300);
const HEART = asset('heart-reaction', 131, 113);
const HEART_EYES = asset('heart-eyes-reaction', 282, 225);
const CHAMPAGNE = asset('champagne-reaction', 205, 226);
const WINK = asset('wink-reaction', 224, 199);

const INVITATION_FLOATS: OccasionFloat[] = [
    { ...COMMENT_2, className: '-right-3 top-[10%] w-[52%] min-[761px]:-right-10 min-[761px]:w-[46%]', motion: 'comment' },
    { ...HEART_EYES, className: '-left-4 bottom-[14%] w-[20%] min-[761px]:-left-8 min-[761px]:w-[16%]', motion: 'emoji' },
];

const GALLERY_FLOATS: OccasionFloat[] = [
    { ...COMMENT, className: '-bottom-6 left-[4%] w-[58%] min-[761px]:w-[44%]', motion: 'comment' },
    { ...HEART, className: '-top-4 right-[10%] w-[13%] min-[761px]:w-[9%]', motion: 'emoji' },
];

const DEFAULT_FEATURE_IMAGES: Record<string, OccasionFeatureImage> = {
    invitation: INVITATION_PHOTO,
    posts: { ...asset('sw-phone-feed-3', 774, 2048), position: 'top' },
    rsvp: RSVP_PHOTO,
    playlist: { ...asset('sw-phone-feed-2', 820, 2048), position: 'bottom' },
    stories: { ...asset('sw-phone-feed', 451, 2048), position: 'top' },
    gallery: QR_PHOTO,
    wishlist: asset('friends-and-family-celebrating-at-sunset', 1448, 1086),
    wishbook: WISH_PHOTO,
    schedule: asset('friends-and-family-celebrating-at-sunset', 1448, 1086),
};

// Shown for a feature with no image of its own.
export const FALLBACK_FEATURE_IMAGE: OccasionFeatureImage = asset('friends-and-family-celebrating-at-sunset', 1448, 1086);

const MEDIA: Partial<Record<EventTypeConvention, OccasionMedia>> = {
    WEDDING: {
        // The hero photo already carries app overlays; reactions only.
        heroFloats: [
            { ...HEART_EYES, className: '-top-5 right-[12%] w-[17%]', motion: 'emoji' },
            { ...CHAMPAGNE, className: '-bottom-5 left-[8%] w-[13%]', motion: 'emoji' },
        ],
        moments: [
            { photo: INVITATION_PHOTO, floats: INVITATION_FLOATS },
            {
                gallery: [
                    asset('02-bride-preparation-santorini', 1536, 1024),
                    asset('03-wedding-ceremony-santorini', 1536, 1024),
                    asset('04-wedding-reception-santorini', 1536, 1024),
                ],
                floats: GALLERY_FLOATS,
            },
            {
                photo: WISH_PHOTO,
                floats: [{ ...asset('wedding-social-post-2', 532, 737), className: '-right-3 bottom-[8%] w-[42%] min-[761px]:-right-10', motion: 'card' }],
            },
        ],
        featureImages: {
            schedule: asset('03-wedding-ceremony-santorini', 1536, 1024),
            wishlist: asset('04-wedding-reception-santorini', 1536, 1024),
        },
        finalImage: asset('storywall-final-cta-wedding-santorini', 1448, 1086),
    },
    BAPTISM: {
        heroFloats: [
            { ...COMMENT, className: '-bottom-6 -left-3 w-[56%] min-[761px]:-left-10 min-[761px]:w-[44%]', motion: 'comment' },
            { ...HEART_EYES, className: '-top-5 right-[14%] w-[17%] min-[761px]:w-[13%]', motion: 'emoji' },
        ],
        moments: [
            { photo: INVITATION_PHOTO, floats: INVITATION_FLOATS },
            {
                // The hero already shows the church outside, so the gallery opens inside it.
                gallery: [
                    asset('baptism-ceremony-inside-the-church', 1448, 1086),
                    asset('happy-baptism-celebration-outside-the-church-on-a-greek-island', 1536, 1024),
                    asset('baptism-celebration-at-the-table', 1448, 1086),
                ],
                floats: GALLERY_FLOATS,
            },
            {
                photo: WISH_PHOTO,
                floats: [
                    { ...COMMENT_2, className: '-right-3 bottom-[12%] w-[52%] min-[761px]:-right-10 min-[761px]:w-[46%]', motion: 'comment' },
                    { ...WINK, className: '-left-4 top-[12%] w-[18%] min-[761px]:-left-8 min-[761px]:w-[14%]', motion: 'emoji' },
                ],
            },
        ],
        featureImages: {
            schedule: asset('baptism-ceremony-inside-the-church', 1448, 1086),
            wishlist: asset('baptism-celebration-at-the-table', 1448, 1086),
        },
        finalImage: asset('baptism-celebration-at-the-table', 1448, 1086),
    },
};

// null → the occasion has no media yet; the page falls back to plain sections.
export function occasionMedia(eventType: EventTypeConvention): OccasionMedia | null {
    return MEDIA[eventType] ?? null;
}

export function occasionFeatureImage(eventType: EventTypeConvention, key: string): OccasionFeatureImage {
    return MEDIA[eventType]?.featureImages[key] ?? DEFAULT_FEATURE_IMAGES[key] ?? FALLBACK_FEATURE_IMAGE;
}
