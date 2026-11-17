import { describe, expect, it } from 'vitest';

import {
    catalogueHref,
    DEFAULT_CATALOGUE_FILTERS,
    type InvitationThemeCardDto,
    type InvitationThemePage,
    mergeCatalogue,
    readCatalogueFilters,
    readThemePage,
    searchText,
    themeCardBackground,
    themeEventTypeKey,
    themePhotoAlt,
    themeSeoCopy,
    themeShareImage,
    themeShareLinks,
    visibleThemes,
} from '@/lib/invitation/themeCatalogue';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

function card(slug: string, name: string, eventType = 'WEDDING'): InvitationThemeCardDto {
    return { slug, name, eventType, cardColor: null, cardThumbUrl: null };
}

const THEMES = [card('olive', 'Olive'), card('kyknos', 'Κύκνος'), card('anchor', 'Anchor', 'BAPTISM'), card('blush', 'Blush')];

function page(overrides: Partial<InvitationThemePage> = {}): InvitationThemePage {
    return {
        slug: 'olive',
        name: 'Olive',
        eventType: 'WEDDING',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        cardColor: null,
        photos: [],
        ...overrides,
    };
}

describe('mergeCatalogue', () => {
    it('keeps each list in its own order, one after the other', () => {
        expect(mergeCatalogue([[card('a', 'A'), card('b', 'B')], [card('c', 'C', 'BAPTISM')]]).map((theme) => theme.slug)).toEqual(['a', 'b', 'c']);
    });
});

describe('readCatalogueFilters', () => {
    it('reads the event type, search and sort from the URL', () => {
        expect(readCatalogueFilters({ type: 'BAPTISM', q: 'anchor', sort: 'az' })).toEqual({ eventType: 'BAPTISM', query: 'anchor', sort: 'az' });
    });

    it('falls back to the defaults for anything it does not know', () => {
        expect(readCatalogueFilters({ type: 'BIRTHDAY', sort: 'price' })).toEqual(DEFAULT_CATALOGUE_FILTERS);
        expect(readCatalogueFilters({})).toEqual(DEFAULT_CATALOGUE_FILTERS);
    });

    it('takes the first of a repeated param', () => {
        expect(readCatalogueFilters({ type: ['WEDDING', 'BAPTISM'] }).eventType).toBe('WEDDING');
    });
});

describe('catalogueHref', () => {
    it('leaves the plain catalogue on its own URL', () => {
        expect(catalogueHref('/invitations', DEFAULT_CATALOGUE_FILTERS)).toBe('/invitations');
        expect(catalogueHref('/invitations', { ...DEFAULT_CATALOGUE_FILTERS, query: '   ' })).toBe('/invitations');
    });

    it('puts every non-default filter in the URL', () => {
        expect(catalogueHref('/el/prosklitiria', { eventType: 'WEDDING', query: 'κύκνος', sort: 'az' })).toBe(
            '/el/prosklitiria?type=WEDDING&q=%CE%BA%CF%8D%CE%BA%CE%BD%CE%BF%CF%82&sort=az',
        );
    });
});

describe('searchText', () => {
    it('ignores case, accents and the final sigma', () => {
        expect(searchText(' Κύκνος ')).toBe('κυκνοσ');
        expect(searchText('KYKNOΣ')).toBe(searchText('kyknoσ'));
    });
});

describe('visibleThemes', () => {
    it('keeps the backend order by default', () => {
        expect(visibleThemes(THEMES, DEFAULT_CATALOGUE_FILTERS, 'en').map((theme) => theme.slug)).toEqual(['olive', 'kyknos', 'anchor', 'blush']);
    });

    it('filters by event type', () => {
        expect(visibleThemes(THEMES, { ...DEFAULT_CATALOGUE_FILTERS, eventType: 'BAPTISM' }, 'en').map((theme) => theme.slug)).toEqual(['anchor']);
    });

    it('finds a Greek name typed without accents', () => {
        expect(visibleThemes(THEMES, { ...DEFAULT_CATALOGUE_FILTERS, query: 'κυκνος' }, 'el').map((theme) => theme.slug)).toEqual(['kyknos']);
    });

    it('sorts A to Z without changing the list it was given', () => {
        const list = [...THEMES];
        expect(visibleThemes(list, { ...DEFAULT_CATALOGUE_FILTERS, sort: 'az' }, 'en').map((theme) => theme.name)).toEqual([
            'Anchor',
            'Blush',
            'Olive',
            'Κύκνος',
        ]);
        expect(list).toEqual(THEMES);
    });
});

describe('readThemePage', () => {
    const dto = {
        slug: 'olive',
        name: 'Olive',
        eventType: 'WEDDING',
        seoTitle: '  ',
        seoDescription: 'Περιγραφή',
        ogImageUrl: null,
        cardColor: '#abc',
        productPhotos: [
            { url: 'https://cdn/1.jpg', alt: 'Πρώτη' },
            { url: null, alt: 'Χωρίς φωτογραφία' },
            { url: 'https://cdn/2.jpg', alt: '' },
        ],
        design: {},
        document: {},
    } as unknown as InvitationThemePublicDto;

    it('keeps only what the page shows, dropping photos without a URL and blank text', () => {
        expect(readThemePage(dto)).toEqual({
            slug: 'olive',
            name: 'Olive',
            eventType: 'WEDDING',
            seoTitle: null,
            seoDescription: 'Περιγραφή',
            ogImageUrl: null,
            cardColor: '#abc',
            photos: [
                { url: 'https://cdn/1.jpg', alt: 'Πρώτη' },
                { url: 'https://cdn/2.jpg', alt: null },
            ],
        });
    });

    it('copes with a theme that has no photos field', () => {
        expect(readThemePage({ ...dto, productPhotos: undefined }).photos).toEqual([]);
    });
});

describe('themePhotoAlt and themeSeoCopy', () => {
    const fallback = { title: 'Olive wedding invitation | StoryWall', description: 'Fallback' };

    it('use the admin wording on the Greek page only', () => {
        const photo = { url: 'https://cdn/1.jpg', alt: 'Πρώτη' };
        expect(themePhotoAlt(photo, 'el', 'Fallback')).toBe('Πρώτη');
        expect(themePhotoAlt(photo, 'en', 'Fallback')).toBe('Fallback');
        expect(themePhotoAlt({ ...photo, alt: null }, 'el', 'Fallback')).toBe('Fallback');

        const theme = page({ seoTitle: 'Τίτλος', seoDescription: 'Περιγραφή' });
        expect(themeSeoCopy(theme, 'el', fallback)).toEqual({ title: 'Τίτλος', description: 'Περιγραφή' });
        expect(themeSeoCopy(theme, 'en', fallback)).toEqual(fallback);
        expect(themeSeoCopy(page(), 'el', fallback)).toEqual(fallback);
    });
});

describe('themeShareImage', () => {
    it('prefers the admin pick, then the first photo, then nothing', () => {
        const photos = [{ url: 'https://cdn/1.jpg', alt: null }];
        expect(themeShareImage(page({ ogImageUrl: 'https://cdn/og.jpg', photos }))).toBe('https://cdn/og.jpg');
        expect(themeShareImage(page({ photos }))).toBe('https://cdn/1.jpg');
        expect(themeShareImage(page())).toBeNull();
    });
});

describe('themeShareLinks', () => {
    it('encodes the page URL and text for each app', () => {
        const links = themeShareLinks('https://www.storywall.gr/invitations/olive', 'Olive & co');
        expect(links.messenger).toBe('fb-messenger://share?link=https%3A%2F%2Fwww.storywall.gr%2Finvitations%2Folive');
        expect(links.whatsapp).toBe('https://wa.me/?text=Olive%20%26%20co%20https%3A%2F%2Fwww.storywall.gr%2Finvitations%2Folive');
        expect(links.viber).toBe('viber://forward?text=Olive%20%26%20co%20https%3A%2F%2Fwww.storywall.gr%2Finvitations%2Folive');
        expect(links.email).toBe('mailto:?subject=Olive%20%26%20co&body=https%3A%2F%2Fwww.storywall.gr%2Finvitations%2Folive');
    });
});

describe('themeEventTypeKey', () => {
    it('labels only the catalogue event types', () => {
        expect(themeEventTypeKey('BAPTISM')).toBe('BAPTISM');
        expect(themeEventTypeKey('BIRTHDAY')).toBeNull();
    });
});

describe('themeCardBackground', () => {
    it('uses the theme colour, expanding a short one', () => {
        expect(themeCardBackground('#abc')).toBe('linear-gradient(160deg, #aabbcc, #aabbcc99)');
        expect(themeCardBackground('#112233')).toBe('linear-gradient(160deg, #112233, #11223399)');
    });

    it('falls back to the default for a missing or broken colour', () => {
        expect(themeCardBackground(null)).toBe('linear-gradient(160deg, #ece4ef, #ece4ef99)');
        expect(themeCardBackground('red; background: url(x)')).toBe('linear-gradient(160deg, #ece4ef, #ece4ef99)');
    });
});
