export type LandingImageAsset = {
    height: number;
    src: string;
    width: number;
};

export type LandingStoryMedia = {
    gallery: LandingImageAsset[];
    main: LandingImageAsset;
};

export const landingStoryMedia: LandingStoryMedia[] = [
    {
        main: { src: '/landing/wedding-party-celebrating-with-social-storywall-overlays.jpg', width: 2048, height: 1152 },
        gallery: [
            { src: '/landing/01-bachelor-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/02-bride-preparation-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/03-wedding-ceremony-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/04-wedding-reception-santorini.webp', width: 1536, height: 1024 },
            { src: '/landing/05-honeymoon-paris.webp', width: 1448, height: 1086 },
        ],
    },
    {
        main: { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.png', width: 1536, height: 1024 },
        gallery: [
            { src: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.png', width: 1536, height: 1024 },
            { src: '/landing/baptism-ceremony-inside-the-church.png', width: 1448, height: 1086 },
            { src: '/landing/baptism-celebration-at-the-table.png', width: 1448, height: 1086 },
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
        main: { src: '/landing/close-up-selfie-of-stylish-guests-and-influencers-celebrating-at.png', width: 1370, height: 1148 },
        gallery: [
            { src: '/landing/close-up-selfie-of-stylish-guests-and-influencers-celebrating-at.png', width: 1370, height: 1148 },
            { src: '/landing/stylish-guests-dancing-at-an-elegant-vip-social-party-at-night.png', width: 1536, height: 1024 },
            { src: '/landing/guests-mingling-with-champagne-at-an-elegant-formal-vip-social-e.png', width: 1536, height: 1024 },
        ],
    },
    {
        main: { src: '/landing/conference-speaker-presenting-on-stage-to-a-professional-audienc.webp', width: 1448, height: 1086 },
        gallery: [
            { src: '/landing/conference-speaker-presenting-on-stage-to-a-professional-audienc.webp', width: 1448, height: 1086 },
            { src: '/landing/wide-view-of-a-large-professional-conference-auditorium-and-stag.webp', width: 1448, height: 1086 },
            { src: '/landing/conference-attendees-networking-in-a-bright-event-venue.webp', width: 1448, height: 1086 },
        ],
    },
];

export const landingMoreStoryImages = [
    'https://images.pexels.com/photos/33635247/pexels-photo-33635247.jpeg?auto=compress&cs=tinysrgb&w=1800',
    'https://images.pexels.com/photos/9215433/pexels-photo-9215433.jpeg?auto=compress&cs=tinysrgb&w=1800',
    'https://images.pexels.com/photos/9901279/pexels-photo-9901279.jpeg?auto=compress&cs=tinysrgb&w=1800',
    'https://images.pexels.com/photos/15141416/pexels-photo-15141416.jpeg?auto=compress&cs=tinysrgb&w=1800',
    'https://images.pexels.com/photos/3419643/pexels-photo-3419643.jpeg?auto=compress&cs=tinysrgb&w=1800',
] as const;
