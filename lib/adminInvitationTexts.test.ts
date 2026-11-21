import { describe, expect, it } from 'vitest';

import {
    type AdminInvitationTextDto,
    buildInvitationTextCreate,
    buildInvitationTextPatch,
    draftFromText,
    groupInvitationTexts,
    nextInvitationTextSortOrder,
    validateInvitationTextDraft,
} from '@/lib/adminInvitationTexts';

const TEXT: AdminInvitationTextDto = {
    id: 't1',
    eventType: 'WEDDING',
    language: 'el',
    label: 'Formal',
    body: 'Με χαρά σας προσκαλούμε\nστον γάμο μας',
    sortOrder: 1,
};

// Sorted as the list comes: event type, language, then sort order.
const TEXTS: AdminInvitationTextDto[] = [
    { ...TEXT, id: 'b1', eventType: 'BAPTISM', sortOrder: 0 },
    { ...TEXT, id: 'b2', eventType: 'BAPTISM', sortOrder: 4 },
    { ...TEXT, id: 'b3', eventType: 'BAPTISM', language: 'en', sortOrder: 9 },
    TEXT,
];

describe('draftFromText', () => {
    it('starts a new text in Greek, on the first event type on offer', () => {
        expect(draftFromText(null)).toEqual({ eventType: '', language: 'el', label: '', body: '' });
    });
});

describe('validateInvitationTextDraft', () => {
    it('needs an event type, a label of 1 to 100 and a text of 1 to 2,000 characters', () => {
        const draft = draftFromText(TEXT);
        expect(validateInvitationTextDraft(draft, 'WEDDING')).toEqual({});
        expect(validateInvitationTextDraft(draft, '')).toEqual({ eventType: true });
        expect(validateInvitationTextDraft({ ...draft, label: 'x'.repeat(101), body: '  ' }, 'WEDDING')).toEqual({ label: true, body: true });
        expect(validateInvitationTextDraft({ ...draft, body: 'x'.repeat(2000) }, 'WEDDING')).toEqual({});
        expect(validateInvitationTextDraft({ ...draft, body: 'x'.repeat(2001) }, 'WEDDING')).toEqual({ body: true });
    });
});

describe('groupInvitationTexts', () => {
    it('groups the texts by event type and language, in the list order', () => {
        expect(groupInvitationTexts(TEXTS).map((group) => [group.key, group.texts.map((text) => text.id)])).toEqual([
            ['BAPTISM:el', ['b1', 'b2']],
            ['BAPTISM:en', ['b3']],
            ['WEDDING:el', ['t1']],
        ]);
    });
});

describe('nextInvitationTextSortOrder', () => {
    it('is one past the last text of the same event type and language', () => {
        expect(nextInvitationTextSortOrder(TEXTS, 'BAPTISM', 'el')).toBe(5);
        expect(nextInvitationTextSortOrder(TEXTS, 'BAPTISM', 'en')).toBe(10);
        expect(nextInvitationTextSortOrder(TEXTS, 'BIRTHDAY', 'el')).toBe(0);
    });
});

describe('buildInvitationTextCreate', () => {
    it('keeps the line breaks, trims the ends, and puts the text last in its group', () => {
        expect(buildInvitationTextCreate({ ...draftFromText(null), label: ' Formal ', body: '\nLine one\nLine two\n' }, 'BAPTISM', TEXTS)).toEqual({
            eventType: 'BAPTISM',
            language: 'el',
            label: 'Formal',
            body: 'Line one\nLine two',
            sortOrder: 5,
        });
    });
});

describe('buildInvitationTextPatch', () => {
    it('sends only what changed', () => {
        expect(buildInvitationTextPatch(TEXT, draftFromText(TEXT), 'WEDDING', TEXTS)).toEqual({});
        expect(buildInvitationTextPatch(TEXT, { ...draftFromText(TEXT), label: 'Warm' }, 'WEDDING', TEXTS)).toEqual({ label: 'Warm' });
    });

    it('puts a text moved to another event type or language last in its new group', () => {
        expect(buildInvitationTextPatch(TEXT, { ...draftFromText(TEXT), language: 'en' }, 'BAPTISM', TEXTS)).toEqual({
            eventType: 'BAPTISM',
            language: 'en',
            sortOrder: 10,
        });
        expect(buildInvitationTextPatch(TEXT, draftFromText(TEXT), 'BAPTISM', TEXTS)).toEqual({ eventType: 'BAPTISM', sortOrder: 5 });
    });
});
