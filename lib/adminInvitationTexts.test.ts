import { describe, expect, it } from 'vitest';

import {
    type AdminInvitationTextDto,
    buildInvitationTextCreate,
    buildInvitationTextPatch,
    draftFromText,
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

describe('draftFromText', () => {
    it('starts a new text in Greek, on the first event type on offer', () => {
        expect(draftFromText(null)).toEqual({ eventType: '', language: 'el', label: '', body: '', sortOrder: '0' });
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

describe('buildInvitationTextCreate', () => {
    it('keeps the line breaks and trims the ends', () => {
        expect(buildInvitationTextCreate({ ...draftFromText(null), label: ' Formal ', body: '\nLine one\nLine two\n' }, 'BAPTISM')).toEqual({
            eventType: 'BAPTISM',
            language: 'el',
            label: 'Formal',
            body: 'Line one\nLine two',
            sortOrder: 0,
        });
    });
});

describe('buildInvitationTextPatch', () => {
    it('sends only what changed', () => {
        expect(buildInvitationTextPatch(TEXT, draftFromText(TEXT), 'WEDDING')).toEqual({});
        expect(buildInvitationTextPatch(TEXT, { ...draftFromText(TEXT), language: 'en', sortOrder: '3' }, 'BAPTISM')).toEqual({
            eventType: 'BAPTISM',
            language: 'en',
            sortOrder: 3,
        });
    });
});
