import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import { isPhotoField, photoFieldSlot, photoFrameSlot, photoSlotKey, setSlotPhoto } from '@/lib/invitation/photoSlots';
import { sampleDraftDocument } from '@/lib/invitation/sampleDraft';
import type { InvitationSection } from '@/lib/invitation/sections';

const PHOTO = { source: 'media', mediaId: 'img-9' } as const;
const SIZE = { width: 1200, height: 800 };

function sectionOf<T extends InvitationSection['type']>(document: InvitationDocument, type: T) {
    return document.sections.find((section): section is Extract<InvitationSection, { type: T }> => section.type === type)!;
}

describe('photo slots', () => {
    it('knows which fields hold a photo', () => {
        expect(isPhotoField('baby', 'babyPhoto')).toBe(true);
        expect(isPhotoField('parentsPhoto', 'parentB.photo')).toBe(true);
        expect(isPhotoField('godparents', 'godparents.gp-1.photo')).toBe(true);
        expect(isPhotoField('weddingSponsors', 'sponsors.sp-1.photo')).toBe(true);
        expect(isPhotoField('coupleProfiles', 'partnerA.photo')).toBe(true);
        expect(isPhotoField('photo', 'photo')).toBe(true);
        // A text, or a photo path of another section type.
        expect(isPhotoField('baby', 'babyName')).toBe(false);
        expect(isPhotoField('godparents', 'godparents.photo')).toBe(false);
        expect(isPhotoField('top', 'photo')).toBe(false);
    });

    it('gives each slot its own key', () => {
        expect(photoSlotKey(photoFieldSlot('s-1', 'parentA.photo'))).toBe('field:s-1:parentA.photo');
        expect(photoSlotKey(photoFrameSlot('el-1'))).toBe('frame:el-1');
    });

    it('puts a photo in a section field', () => {
        const document = sampleDraftDocument();
        const baby = sectionOf(document, 'baby');
        const parents = sectionOf(document, 'parentsPhoto');

        const next = produce(document, (draft) => {
            setSlotPhoto(photoFieldSlot(baby.id, 'babyPhoto'), PHOTO, SIZE)(draft);
            setSlotPhoto(photoFieldSlot(parents.id, 'parentB.photo'), PHOTO, SIZE)(draft);
        });

        expect(sectionOf(next, 'baby').data.babyPhoto).toEqual(PHOTO);
        expect(sectionOf(next, 'parentsPhoto').data.parentB.photo).toEqual(PHOTO);
        expect(sectionOf(next, 'parentsPhoto').data.parentA).toEqual(parents.data.parentA);
    });

    it('finds a list item by its id', () => {
        const document = sampleDraftDocument();
        const godparents = sectionOf(document, 'godparents');
        const second = godparents.data.godparents[1];

        const next = produce(document, setSlotPhoto(photoFieldSlot(godparents.id, `godparents.${second.id}.photo`), PHOTO, SIZE));

        const people = sectionOf(next, 'godparents').data.godparents;
        expect(people[1].photo).toEqual(PHOTO);
        expect(people[0]).toEqual(godparents.data.godparents[0]);
    });

    it('puts a photo in a frame with its size and keeps the crop', () => {
        const document = sampleDraftDocument();
        const frame = document.sections.flatMap((section) => section.elements).find((element) => element.kind === 'photoFrame')!;

        const next = produce(document, setSlotPhoto(photoFrameSlot(frame.id), PHOTO, SIZE));

        const saved = next.sections.flatMap((section) => section.elements).find((element) => element.id === frame.id);
        expect(saved).toMatchObject({ photo: PHOTO, imageWidth: 1200, imageHeight: 800, imageX: frame.kind === 'photoFrame' && frame.imageX });
    });

    it('leaves the document alone when the slot is gone', () => {
        const document = sampleDraftDocument();
        const baby = sectionOf(document, 'baby');

        expect(produce(document, setSlotPhoto(photoFieldSlot('gone', 'babyPhoto'), PHOTO, SIZE))).toBe(document);
        expect(produce(document, setSlotPhoto(photoFrameSlot('gone'), PHOTO, SIZE))).toBe(document);
        expect(produce(document, setSlotPhoto(photoFieldSlot(baby.id, 'babyName'), PHOTO, SIZE))).toBe(document);
        const godparents = sectionOf(document, 'godparents');
        expect(produce(document, setSlotPhoto(photoFieldSlot(godparents.id, 'godparents.gone.photo'), PHOTO, SIZE))).toBe(document);
    });
});
