import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import {
    findMissingThemeAssets,
    INVITATION_SCHEMA_VERSION,
    invitationDocumentSchema,
    publishedInvitationSchema,
    upgradeInvitationDocument,
} from '@/lib/invitation/document';
import { textStyleSchema } from '@/lib/invitation/primitives';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { FEED_SECTION_TYPES, type FeedModuleKey, resolveTextField, SECTION_TYPES, sectionSchema } from '@/lib/invitation/sections';
import { themeDesignSchema } from '@/lib/invitation/theme';

const clone = <T>(value: T): T => structuredClone(value);

describe('invitation document format', () => {
    it('covers the 30 section types of the old editor, the 4 feed blocks, the module block and the 4 Feed mode sections', () => {
        expect(SECTION_TYPES).toHaveLength(40);
    });

    it.each(SECTION_TYPES)('accepts the %s sample', (type) => {
        expect(sectionSchema.safeParse(SAMPLE_SECTIONS[type]).error).toBeUndefined();
    });

    it('accepts the sample document and theme', () => {
        expect(invitationDocumentSchema.safeParse(SAMPLE_DOCUMENT).error).toBeUndefined();
        expect(themeDesignSchema.safeParse(SAMPLE_THEME).error).toBeUndefined();
        expect(findMissingThemeAssets(SAMPLE_DOCUMENT, SAMPLE_THEME)).toEqual([]);
    });

    it('accepts a published snapshot', () => {
        const published = { document: SAMPLE_DOCUMENT, theme: SAMPLE_THEME, themeRevision: 3, publishedAt: '2026-11-02T10:00:00Z' };
        expect(publishedInvitationSchema.safeParse(published).error).toBeUndefined();
    });

    it('rejects unknown fields', () => {
        const section = clone(SAMPLE_SECTIONS.gift) as unknown as { data: Record<string, unknown> };
        section.data.swift = 'X';
        expect(sectionSchema.safeParse(section).success).toBe(false);
    });

    it('rejects inline images and unsafe values', () => {
        const baby = clone(SAMPLE_SECTIONS.baby) as unknown as { data: Record<string, unknown> };
        baby.data.babyPhoto = 'data:image/png;base64,AAAA';
        expect(sectionSchema.safeParse(baby).success).toBe(false);

        const contact = clone(SAMPLE_SECTIONS.contact);
        contact.data.facebook = 'javascript:alert(1)';
        expect(sectionSchema.safeParse(contact).success).toBe(false);

        const footer = clone(SAMPLE_SECTIONS.footer);
        footer.data.font = 'Arial;}body{display:none';
        expect(sectionSchema.safeParse(footer).success).toBe(false);
    });

    it('rejects a style for a field that does not exist', () => {
        const section = clone(SAMPLE_SECTIONS.programIcons);
        section.textStyles['items.missing.label'] = { bold: true };
        expect(sectionSchema.safeParse(section).success).toBe(false);
    });

    it('finds list fields by item id', () => {
        expect(resolveTextField(SAMPLE_SECTIONS.godparents.data, 'godparents.g2.name')).toBe('Άννα');
        expect(resolveTextField(SAMPLE_SECTIONS.godparents.data, 'godparents.0.name')).toBeUndefined();
    });

    it('allows columns only in custom sections', () => {
        const section = clone(SAMPLE_SECTIONS.invitation);
        section.elements.push({ id: 'e-break', kind: 'columnBreak' });
        expect(sectionSchema.safeParse(section).success).toBe(false);
    });

    it('rejects duplicate single sections and a footer that is not last', () => {
        const twice = { ...SAMPLE_DOCUMENT, sections: [...SAMPLE_DOCUMENT.sections, { ...SAMPLE_SECTIONS.gift, id: 's-gift-2' }] };
        expect(invitationDocumentSchema.safeParse(twice).success).toBe(false);

        const footerFirst = { ...SAMPLE_DOCUMENT, sections: [SAMPLE_SECTIONS.footer, SAMPLE_SECTIONS.top] };
        expect(invitationDocumentSchema.safeParse(footerFirst).success).toBe(false);
    });

    it('allows several photo sections', () => {
        const photos = { ...SAMPLE_DOCUMENT, sections: [SAMPLE_SECTIONS.photo, { ...SAMPLE_SECTIONS.photo, id: 's-photo-2' }] };
        expect(invitationDocumentSchema.safeParse(photos).error).toBeUndefined();
    });

    it('reports theme assets the theme does not have', () => {
        const theme = { ...SAMPLE_THEME, transitions: [] };
        expect(findMissingThemeAssets(SAMPLE_DOCUMENT, theme)).toEqual(['tr-wave']);
    });

    it('loads a current document and refuses an unknown version', () => {
        expect(upgradeInvitationDocument(SAMPLE_DOCUMENT).schemaVersion).toBe(INVITATION_SCHEMA_VERSION);
        expect(() => upgradeInvitationDocument({ ...SAMPLE_DOCUMENT, schemaVersion: 0 })).toThrow();
    });

    it('names the four feed blocks', () => {
        expect([...FEED_SECTION_TYPES]).toEqual(['feedCover', 'feedDetails', 'feedDescription', 'feedRsvp']);
    });

    it('holds each feed block at most once', () => {
        const cover = clone(SAMPLE_SECTIONS.feedCover);
        const document = { ...clone(SAMPLE_DOCUMENT), sections: [cover, { ...cover, id: 's-feedCover-2' }] };
        expect(invitationDocumentSchema.safeParse(document).success).toBe(false);
    });

    it('stores no data on a feed block', () => {
        const section = clone(SAMPLE_SECTIONS.feedDetails) as unknown as { data: Record<string, unknown> };
        section.data.title = 'X';
        expect(sectionSchema.safeParse(section).success).toBe(false);
    });
});

describe('the feed background colour', () => {
    const withBackground = (backgroundColor: string) => ({
        ...SAMPLE_DOCUMENT,
        overrides: { ...SAMPLE_DOCUMENT.overrides, backgroundColor },
    });

    it('takes a #RRGGBB colour', () => {
        expect(invitationDocumentSchema.safeParse(withBackground('#AABBCC')).success).toBe(true);
    });

    it('refuses anything else', () => {
        for (const bad of ['red', 'transparent', '#abc', '#AABBCCDD']) {
            expect(invitationDocumentSchema.safeParse(withBackground(bad)).success).toBe(false);
        }
    });
});

describe('members-only sections', () => {
    const withFlag = (value: unknown) => ({
        ...SAMPLE_DOCUMENT,
        sections: SAMPLE_DOCUMENT.sections.map((section, index) => (index === 1 ? { ...section, membersOnly: value } : section)),
    });

    it('accepts the flag, and a section without it', () => {
        expect(invitationDocumentSchema.safeParse(withFlag(true)).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(withFlag(false)).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(SAMPLE_DOCUMENT).success).toBe(true);
    });

    it('refuses anything but true or false', () => {
        expect(invitationDocumentSchema.safeParse(withFlag('yes')).success).toBe(false);
    });
});

describe('letter spacing and capitals (KAN-262)', () => {
    it('takes spacing from -5 to 50 pixels', () => {
        expect(textStyleSchema.safeParse({ letterSpacing: 51 }).success).toBe(false);
        expect(textStyleSchema.safeParse({ letterSpacing: -5, uppercase: false }).success).toBe(true);
    });
});

describe('feedModule', () => {
    it('holds one of the tile modules', () => {
        const doc = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, feedModuleSection('playlist', () => 'm1')] };
        expect(invitationDocumentSchema.safeParse(doc).success).toBe(true);
    });

    it('refuses any other module', () => {
        const bad = { ...feedModuleSection('playlist', () => 'm1'), data: { module: 'posts' } };
        const doc = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, bad] };
        expect(invitationDocumentSchema.safeParse(doc).success).toBe(false);
    });

    it('comes once per module: two modules are fine, the same one twice is not (KAN-271)', () => {
        const withModules = (...modules: FeedModuleKey[]) => ({
            ...defaultFeedLayout(),
            sections: [...defaultFeedLayout().sections, ...modules.map((module, index) => feedModuleSection(module, () => `m${index}`))],
        });
        expect(invitationDocumentSchema.safeParse(withModules('quiz_polls', 'playlist')).error).toBeUndefined();
        const twice = invitationDocumentSchema.safeParse(withModules('playlist', 'quiz_polls', 'playlist'));
        expect(twice.error?.issues).toMatchObject([{ path: ['sections', 6], message: 'Module block used twice' }]);
    });
});

describe('feed sections', () => {
    // A feed layout: an invitation's footer must stay last.
    const withSection = (section: unknown) => ({ ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, section] });
    const base = { id: 'f-1', name: 'feedPrompt', visible: true, locked: false, textStyles: {}, elements: [], style: SAMPLE_DOCUMENT.sections[0].style };

    it('accepts each of them', () => {
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedSchedule', data: {} })).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedPrompt', data: { text: 'Show us' } })).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedHeOrShe', data: {} })).success).toBe(true);
    });

    it('refuses a prompt over 80 characters, and data on the schedule or on Boy or Girl', () => {
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedPrompt', data: { text: 'x'.repeat(81) } })).success).toBe(false);
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedSchedule', data: { day: 1 } })).success).toBe(false);
        expect(invitationDocumentSchema.safeParse(withSection({ ...base, type: 'feedHeOrShe', data: { guess: 'HE' } })).success).toBe(false);
    });

    it('takes Pinned photos with up to six uploaded photos', () => {
        const photo = (id: string) => ({ id, image: { source: 'media', mediaId: `img-${id}` } });
        const pinned = (photos: unknown[]) => withSection({ ...base, type: 'feedPinned', data: { photos } });
        expect(invitationDocumentSchema.safeParse(pinned([])).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(pinned(['1', '2', '3', '4', '5', '6'].map(photo))).success).toBe(true);
        expect(invitationDocumentSchema.safeParse(pinned(['1', '2', '3', '4', '5', '6', '7'].map(photo))).success).toBe(false);
        expect(invitationDocumentSchema.safeParse(pinned([{ id: 't', image: { source: 'theme', assetId: 'a' } }])).success).toBe(false);
    });
});
