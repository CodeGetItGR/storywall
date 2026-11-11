import type { InvitationThemeCardDto, InvitationThemePage } from '@/lib/invitation/themeCatalogue';

// Stories only: themes as the backend lists them, with the repo's own images so the visual check is stable.
export const STORY_WEDDING_THEMES: InvitationThemeCardDto[] = [
    { slug: 'olive', name: 'Olive', eventType: 'WEDDING', cardColor: '#d8c7b4', cardThumbUrl: '/images/post-florals.png' },
    { slug: 'kyknos', name: 'Κύκνος', eventType: 'WEDDING', cardColor: '#e7dfe9', cardThumbUrl: '/images/post-flowers.png' },
    { slug: 'blush', name: 'Blush', eventType: 'WEDDING', cardColor: '#f1d9d4', cardThumbUrl: '/images/post-cake.png' },
    { slug: 'midnight', name: 'Midnight', eventType: 'WEDDING', cardColor: '#2f3346', cardThumbUrl: '/images/post-tux.png' },
    { slug: 'terrace', name: 'Terrace', eventType: 'WEDDING', cardColor: '#cfd8c4', cardThumbUrl: '/images/venue.png' },
];

export const STORY_BAPTISM_THEMES: InvitationThemeCardDto[] = [
    { slug: 'anchor', name: 'Anchor', eventType: 'BAPTISM', cardColor: '#cfe0ea', cardThumbUrl: '/images/banner.jpg' },
    // No card image yet: its colour stands in.
    { slug: 'little-star', name: 'Little star', eventType: 'BAPTISM', cardColor: '#f3e6c4', cardThumbUrl: null },
];

export const STORY_THEME_PAGE: InvitationThemePage = {
    slug: 'olive',
    name: 'Olive',
    eventType: 'WEDDING',
    seoTitle: null,
    seoDescription: null,
    ogImageUrl: null,
    cardColor: '#d8c7b4',
    photos: [
        { url: '/images/post-florals.png', alt: null },
        { url: '/images/post-cake.png', alt: null },
        { url: '/images/venue.png', alt: null },
    ],
};

// The theme as GET /api/invitation-themes/{slug} answers, which the page reads down to InvitationThemePage.
export function storyThemeDto(page: InvitationThemePage) {
    return { ...page, productPhotos: page.photos, design: {}, document: {}, assetUrls: {} };
}
