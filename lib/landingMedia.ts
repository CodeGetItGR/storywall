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

export const landingMoreStoryMedia = [
    {
        objectPosition: '50% 18%',
        src: 'https://images.pexels.com/photos/33635247/pexels-photo-33635247.jpeg?auto=compress&cs=tinysrgb&w=1800',
    },
    {
        objectPosition: '50% 25%',
        src: 'https://images.pexels.com/photos/9215433/pexels-photo-9215433.jpeg?auto=compress&cs=tinysrgb&w=1800',
    },
    {
        objectPosition: '50% 50%',
        src: 'https://images.pexels.com/photos/9901279/pexels-photo-9901279.jpeg?auto=compress&cs=tinysrgb&w=1800',
    },
    {
        objectPosition: '50% 50%',
        src: 'https://images.pexels.com/photos/15141416/pexels-photo-15141416.jpeg?auto=compress&cs=tinysrgb&w=1800',
    },
    {
        objectPosition: '50% 50%',
        src: 'https://images.pexels.com/photos/3419643/pexels-photo-3419643.jpeg?auto=compress&cs=tinysrgb&w=1800',
    },
] as const;
