import type { EventTypeConvention } from '@/lib/api/types';

export type LandingImageAsset = {
    height: number;
    src: string;
    width: number;
};

export type LandingStoryMedia = {
    // Demo event type slug (/demo/{slug}) shown as an "open demo" link on the row.
    demoEventTypeSlug?: string;
    gallery: LandingImageAsset[];
    main: LandingImageAsset;
    // The occasion page this row links to, when it is live (lib/occasions/occasions.ts).
    occasion?: EventTypeConvention;
    // Event type whose theme presets are shown under the row.
    themeEventType?: EventTypeConvention;
};

export const landingStoryMedia: LandingStoryMedia[] = [
    {
        demoEventTypeSlug: 'wedding',
        occasion: 'WEDDING',
        main: { src: '/landing/wedding-party-celebrating-with-social-storywall-overlays.webp', width: 2048, height: 1152 },
        gallery: [
            { src: '/landing/01-bachelor-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/02-bride-preparation-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/03-wedding-ceremony-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/04-wedding-reception-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/05-honeymoon-paris.webp', width: 1448, height: 1086 },
        ],
    },
    {
        occasion: 'BAPTISM',
        themeEventType: 'BAPTISM',
        main: { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', width: 1536, height: 1024 },
        gallery: [
            { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', width: 1536, height: 1024 },
            { src: '/landing/baptism-ceremony-inside-the-church.webp', width: 1448, height: 1086 },
            { src: '/landing/baptism-celebration-at-the-table.webp', width: 1448, height: 1086 },
        ],
    },
    {
        main: { src: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp', width: 1536, height: 1024 },
        gallery: [
            { src: '/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp', width: 1536, height: 1024 },
            { src: '/landing/pregnant-couple-at-a-baby-boy-celebration.webp', width: 1370, height: 1148 },
            { src: '/landing/friends-and-family-celebrating-at-sunset.webp', width: 1448, height: 1086 },
        ],
    },
    {
        main: { src: '/landing/close-up-selfie-of-stylish-guests-and-influencers-celebrating-at.webp', width: 1370, height: 1148 },
        gallery: [
            { src: '/landing/close-up-selfie-of-stylish-guests-and-influencers-celebrating-at.webp', width: 1370, height: 1148 },
            { src: '/landing/stylish-guests-dancing-at-an-elegant-vip-social-party-at-night.webp', width: 1536, height: 1024 },
            { src: '/landing/guests-mingling-with-champagne-at-an-elegant-formal-vip-social-e.webp', width: 1536, height: 1024 },
        ],
    },
];

// One photo per "more stories" card, in the order of LandingPage.stories.moreStories.
export const landingMoreStoryMedia = [
    { objectPosition: '50% 18%', src: '/landing/woman-in-black-dress-holding-birthday-cake.webp' },
    { objectPosition: '50% 25%', src: '/landing/pregnant-woman-and-friends-with-pink-and-blue-balloons.webp' },
    { objectPosition: '50% 50%', src: '/landing/couple-cheering-with-guests-under-lit-arch-at-night.webp' },
] as const;
