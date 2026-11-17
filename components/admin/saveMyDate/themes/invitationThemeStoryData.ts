import { type AdminInvitationThemeDto, type AdminInvitationThemeSummaryDto, BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';

// Fixtures for the Save my date themes stories. Dates sit just before Storybook's fixed clock (2026-06-15).

export const storyEventTypes = [
    { eventTypeKey: 'WEDDING', name: { en: 'Wedding', el: 'Γάμος' } },
    { eventTypeKey: 'BAPTISM', name: { en: 'Baptism', el: 'Βάπτιση' } },
    { eventTypeKey: 'BIRTHDAY', name: { en: 'Birthday', el: 'Γενέθλια' } },
    { eventTypeKey: 'BABY_SHOWER', name: { en: 'Baby shower', el: 'Baby shower' } },
    { eventTypeKey: 'GENDER_REVEAL', name: { en: 'Gender reveal', el: 'Gender reveal' } },
];

export function storyThemeSummary(overrides: Partial<AdminInvitationThemeSummaryDto> = {}): AdminInvitationThemeSummaryDto {
    return {
        id: 'theme-1',
        eventType: 'WEDDING',
        status: 'ACTIVE',
        name: 'Γάμος 001',
        slug: 'gamos-001',
        code: 'W001',
        sortOrder: 0,
        revision: 3,
        cardThumbUrl: '/images/post-florals.png',
        updatedAt: '2026-06-12T09:30:00Z',
        ...overrides,
    };
}

export const storyThemeList: AdminInvitationThemeSummaryDto[] = [
    storyThemeSummary(),
    storyThemeSummary({ id: 'theme-2', name: 'Γάμος 002', slug: 'gamos-002', code: 'W002', sortOrder: 1, cardThumbUrl: '/images/post-flowers.png' }),
    storyThemeSummary({
        id: 'theme-3',
        name: 'Garden party',
        slug: 'garden-party',
        code: null,
        status: 'DRAFT',
        sortOrder: 2,
        cardThumbUrl: null,
        updatedAt: '2026-06-14T16:05:00Z',
    }),
    storyThemeSummary({
        id: 'theme-4',
        eventType: 'BAPTISM',
        name: 'Βάπτιση αστέρια',
        slug: 'vaptisi-asteria',
        code: 'B001',
        status: 'HIDDEN',
        cardThumbUrl: '/images/post-cake.png',
        updatedAt: '2026-05-28T11:00:00Z',
    }),
    storyThemeSummary({ id: 'theme-5', eventType: 'BIRTHDAY', name: 'Confetti', slug: 'confetti', code: 'BD01', cardThumbUrl: '/images/venue.png' }),
];

export function storyTheme(overrides: Partial<AdminInvitationThemeDto> = {}): AdminInvitationThemeDto {
    const summary = storyThemeSummary();
    return {
        id: summary.id,
        eventType: summary.eventType,
        status: summary.status,
        name: summary.name,
        slug: summary.slug,
        code: summary.code,
        description: null,
        cardColor: null,
        seoTitle: 'Ψηφιακή πρόσκληση γάμου',
        seoDescription: 'Στείλτε την πρόσκληση του γάμου σας με ένα link.',
        ogImageAssetId: null,
        cardThumbAssetId: null,
        productPhotos: [],
        sortOrder: 0,
        design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
        document: blankThemeDocument('WEDDING', summary.slug, storySectionIds()) as unknown as Record<string, unknown>,
        revision: 3,
        assets: [],
        updatedAt: summary.updatedAt,
        ...overrides,
    };
}

// Fixed section ids, so a story renders the same every time.
function storySectionIds() {
    let next = 0;
    return () => {
        next += 1;
        return `story-section-${next}`;
    };
}
