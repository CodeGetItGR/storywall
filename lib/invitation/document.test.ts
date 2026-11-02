import { describe, expect, it } from 'vitest';

import {
    findMissingThemeAssets,
    INVITATION_SCHEMA_VERSION,
    invitationDocumentSchema,
    publishedInvitationSchema,
    upgradeInvitationDocument,
} from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { resolveTextField, SECTION_TYPES,sectionSchema } from '@/lib/invitation/sections';
import { themeDesignSchema } from '@/lib/invitation/theme';

const clone = <T>(value: T): T => structuredClone(value);

describe('invitation document format', () => {
    it('covers all 30 section types of the old editor', () => {
        expect(SECTION_TYPES).toHaveLength(30);
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
});
