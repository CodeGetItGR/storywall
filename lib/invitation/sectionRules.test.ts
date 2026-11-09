import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { addableSectionTypes, sectionsForEventType } from '@/lib/invitation/sectionRules';
import type { InvitationSection } from '@/lib/invitation/sections';

function documentWith(...sections: InvitationSection[]): InvitationDocument {
    return { schemaVersion: 1, themeId: 't1', overrides: {}, sections };
}

describe('addableSectionTypes', () => {
    it("lists a wedding's sections in the old editor's order, without the footer or admin-only ones", () => {
        expect(addableSectionTypes(documentWith(), 'WEDDING', 'host')).toEqual([
            'top', 'invitation', 'date', 'countdown', 'locations', 'parents', 'rsvp', 'gift', 'accommodation', 'program',
            'programIcons', 'contact', 'gallery', 'faq', 'blank', 'photo', 'coupleNames', 'ourStoryProposal', 'dressCode',
            'coupleContact', 'weddingSponsors', 'coupleProfiles', 'coupleProfilesSimple', 'weddingSponsorsSimple',
        ]);
    });

    it('keeps baptism sections to the baptism list', () => {
        const types = addableSectionTypes(documentWith(), 'BAPTISM', 'host');
        expect(types).toContain('godparents');
        expect(types).not.toContain('coupleNames');
    });

    it('offers the framed photo to admins only', () => {
        expect(addableSectionTypes(documentWith(), 'WEDDING', 'host')).not.toContain('photoFrame');
        expect(addableSectionTypes(documentWith(), 'WEDDING', 'admin')).toContain('photoFrame');
    });

    it('hides a section that may appear once while it is on the page, but not repeatable ones', () => {
        const document = documentWith(SAMPLE_SECTIONS.rsvp, SAMPLE_SECTIONS.blank, SAMPLE_SECTIONS.photo);
        const types = addableSectionTypes(document, 'WEDDING', 'host');
        expect(types).not.toContain('rsvp');
        expect(types).toContain('blank');
        expect(types).toContain('photo');
    });

    it('gives event types the old app did not have the birthday list', () => {
        for (const eventType of ['SOCIAL_EVENT', 'PRIVATE_PARTY', 'REUNION', 'SOMETHING_NEW']) {
            expect(sectionsForEventType(eventType)).toBe(sectionsForEventType('BIRTHDAY'));
        }
    });
});
