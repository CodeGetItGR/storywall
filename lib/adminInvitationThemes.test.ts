import { describe, expect, it } from 'vitest';

import {
    type AdminInvitationThemeDto,
    type AdminInvitationThemeSummaryDto,
    adminThemePreview,
    BLANK_THEME_DESIGN,
    blankThemeDocument,
    filterInvitationThemes,
    followNameSlug,
    hasThemeDetailErrors,
    isValidThemeName,
    isValidThemeSlug,
    slugifyThemeName,
    themeCreateRequest,
    themeDetails,
    themeDetailsChanged,
    themeDuplicateRequest,
    themeEventTypes,
    themeSaveFailure,
    themesOfEventType,
    themeUpdateRequest,
    uniqueThemeSlug,
    validateThemeDetails,
} from '@/lib/adminInvitationThemes';
import { ApiError } from '@/lib/api/client';
import { themeDesignSchema } from '@/lib/invitation/theme';

function summary(overrides: Partial<AdminInvitationThemeSummaryDto>): AdminInvitationThemeSummaryDto {
    return {
        id: 't1',
        eventType: 'WEDDING',
        status: 'ACTIVE',
        name: 'Γάμος 001',
        slug: 'gamos-001',
        code: 'W001',
        sortOrder: 0,
        revision: 1,
        cardThumbUrl: null,
        updatedAt: '2026-11-01T10:00:00Z',
        ...overrides,
    };
}

function theme(overrides: Partial<AdminInvitationThemeDto> = {}): AdminInvitationThemeDto {
    return {
        id: 't1',
        eventType: 'WEDDING',
        status: 'DRAFT',
        name: 'Γάμος 001',
        slug: 'gamos-001',
        code: 'W001',
        description: 'Old description',
        cardColor: '#ffffff',
        seoTitle: null,
        seoDescription: 'Wedding invitation',
        ogImageAssetId: 'og',
        cardThumbAssetId: 'thumb',
        productPhotos: [{ mediaId: 'p1', alt: 'Photo' }],
        sortOrder: 3,
        design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
        document: blankThemeDocument('WEDDING', 'gamos-001') as unknown as Record<string, unknown>,
        revision: 4,
        assets: [{ assetId: 'thumb', url: 'https://cdn.test/thumb.webp', contentType: 'image/webp', width: 10, height: 10, byteSize: 100 }],
        updatedAt: '2026-11-01T10:00:00Z',
        ...overrides,
    };
}

function apiError(errorCode: number) {
    return new ApiError(409, { errorCode, status: 409 });
}

describe('filterInvitationThemes', () => {
    const themes = [
        summary({ id: 'a' }),
        summary({ id: 'b', name: 'Baptism stars', slug: 'baptism-stars', code: null, eventType: 'BAPTISM', status: 'DRAFT' }),
        summary({ id: 'c', name: 'Hidden one', slug: 'hidden-one', status: 'HIDDEN' }),
    ];
    const ids = (list: AdminInvitationThemeSummaryDto[]) => list.map((item) => item.id);

    it('finds a Greek name without its accents, and by slug or code', () => {
        expect(ids(filterInvitationThemes(themes, { search: 'γαμος', status: 'ALL', eventType: 'ALL' }))).toEqual(['a']);
        expect(ids(filterInvitationThemes(themes, { search: 'STARS', status: 'ALL', eventType: 'ALL' }))).toEqual(['b']);
        expect(ids(filterInvitationThemes(themes, { search: 'w001', status: 'ALL', eventType: 'ALL' }))).toEqual(['a', 'c']);
    });

    it('filters by status and by event type', () => {
        expect(ids(filterInvitationThemes(themes, { search: '', status: 'HIDDEN', eventType: 'ALL' }))).toEqual(['c']);
        expect(ids(filterInvitationThemes(themes, { search: '  ', status: 'ALL', eventType: 'BAPTISM' }))).toEqual(['b']);
    });
});

describe('themeEventTypes', () => {
    it('lists the types the list has, known ones in their order first', () => {
        const themes = [summary({ eventType: 'ZEBRA' }), summary({ eventType: 'BIRTHDAY' }), summary({ eventType: 'WEDDING' })];
        expect(themeEventTypes(themes)).toEqual(['WEDDING', 'BIRTHDAY', 'ZEBRA']);
    });
});

describe('slugs', () => {
    it('writes Greek in Latin letters', () => {
        expect(slugifyThemeName('Γάμος 001')).toBe('gamos-001');
        expect(slugifyThemeName('  Βάπτιση — Αστέρια!  ')).toBe('vaptisi-asteria');
        expect(slugifyThemeName('***')).toBe('');
    });

    it('never passes the backend limit, nor ends in a hyphen', () => {
        const slug = slugifyThemeName(`${'a'.repeat(119)} b`);
        expect(slug.length).toBeLessThanOrEqual(120);
        expect(slug.endsWith('-')).toBe(false);
    });

    it('adds a number until the slug is free', () => {
        expect(uniqueThemeSlug('gamos', [])).toBe('gamos');
        expect(uniqueThemeSlug('gamos', ['gamos', 'gamos-2'])).toBe('gamos-3');
        expect(uniqueThemeSlug('', [])).toBe('theme');
        expect(uniqueThemeSlug('a'.repeat(120), ['a'.repeat(120)])).toHaveLength(120);
    });

    it('checks slugs and names the way the backend does', () => {
        expect(isValidThemeSlug('gamos-001')).toBe(true);
        expect(isValidThemeSlug('Gamos')).toBe(false);
        expect(isValidThemeSlug('gamos--1')).toBe(false);
        expect(isValidThemeName('  ')).toBe(false);
        expect(isValidThemeName(' Γάμος ')).toBe(true);
        expect(isValidThemeName('a'.repeat(121))).toBe(false);
    });
});

describe('drawer details', () => {
    it('reads a theme, and notices a change', () => {
        const details = themeDetails(theme());
        expect(details).toMatchObject({ seoTitle: '', seoDescription: 'Wedding invitation' });
        expect(themeDetailsChanged(details, theme())).toBe(false);
        expect(themeDetailsChanged({ ...details, status: 'ACTIVE' }, theme())).toBe(true);
    });

    it('flags a bad name or slug', () => {
        const details = themeDetails(theme());
        expect(hasThemeDetailErrors(validateThemeDetails(details))).toBe(false);
        expect(validateThemeDetails({ ...details, name: '', slug: 'Bad slug' })).toEqual({ name: true, slug: true });
    });

    it('lets the slug follow the name only while it is the name’s slug', () => {
        const details = themeDetails(theme());
        expect(followNameSlug(details, 'Γάμος 002')).toBe('gamos-002');
        expect(followNameSlug({ ...details, slug: 'chosen' }, 'Γάμος 002')).toBe('chosen');
        expect(followNameSlug(details, '!!!')).toBe('gamos-001');
    });

    it('sends every field back on save, with the loaded revision, but no sort order', () => {
        const loaded = theme();
        const request = themeUpdateRequest(loaded, { ...themeDetails(loaded), name: ' New ', seoTitle: '  ', status: 'HIDDEN' });
        expect(request).toMatchObject({
            name: 'New',
            status: 'HIDDEN',
            seoTitle: null,
            seoDescription: 'Wedding invitation',
            revision: 4,
            code: 'W001',
            description: 'Old description',
            ogImageAssetId: 'og',
            productPhotos: [{ mediaId: 'p1', alt: 'Photo' }],
        });
        expect(request.design).toBe(loaded.design);
        // A move in the list since the theme loaded must stay.
        expect(request).not.toHaveProperty('sortOrder');
    });

    it('tells a taken slug and a stale save from other failures', () => {
        expect(themeSaveFailure(apiError(5200))).toEqual({ kind: 'slugTaken' });
        expect(themeSaveFailure(apiError(5201))).toEqual({ kind: 'stale' });
        const other = new Error('offline');
        expect(themeSaveFailure(other)).toEqual({ kind: 'other', error: other });
    });
});

describe('new themes', () => {
    it('makes a draft with no images, a unique slug and the event type’s sections', () => {
        const request = themeCreateRequest({ name: ' Γάμος 001 ', eventType: 'BAPTISM' }, ['gamos-001']);
        expect(request).toMatchObject({ status: 'DRAFT', name: 'Γάμος 001', slug: 'gamos-001-2', eventType: 'BAPTISM', productPhotos: [] });
        // The backend puts it last among its event type.
        expect(request).not.toHaveProperty('sortOrder');
        expect(themeDesignSchema.parse(request.design)).toBeTruthy();
        const document = request.document as { themeId: string; sections: { type: string; id: string }[] };
        expect(document.themeId).toBe('gamos-001-2');
        expect(document.sections.at(-1)?.type).toBe('footer');
        expect(new Set(document.sections.map((section) => section.id)).size).toBe(document.sections.length);
        expect(JSON.stringify(request.design)).not.toMatch(/mediaId|assetId/);
    });

    it('names a copy with its own slug', () => {
        expect(themeDuplicateRequest(' Γάμος 001 ', ['gamos-001'])).toEqual({ name: 'Γάμος 001', slug: 'gamos-001-2' });
    });

    it('picks one event type’s themes, in their order', () => {
        const themes = [summary({ id: 'b1', eventType: 'BAPTISM' }), summary({ id: 'w1' }), summary({ id: 'w2', sortOrder: 1 })];
        expect(themesOfEventType(themes, 'WEDDING').map((item) => item.id)).toEqual(['w1', 'w2']);
        expect(themesOfEventType(themes, 'BIRTHDAY')).toEqual([]);
    });
});

describe('adminThemePreview', () => {
    it('draws a theme whatever its status, its images from the admin assets', () => {
        const preview = adminThemePreview(theme({ status: 'HIDDEN' }));
        expect(preview.media('thumb')).toBe('https://cdn.test/thumb.webp');
        expect(preview.document.sections.length).toBeGreaterThan(0);
    });

    it('throws for a design the renderer can’t draw', () => {
        expect(() => adminThemePreview(theme({ design: { nope: true } }))).toThrow();
    });
});
