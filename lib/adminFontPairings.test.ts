import { describe, expect, it } from 'vitest';

import {
    type AdminFontPairingDto,
    buildFontPairingCreate,
    buildFontPairingPatch,
    draftFromPairing,
    fontPairingFontLabel,
    fontPairingFontOptions,
    matchingFontValue,
    validateFontPairingDraft,
} from '@/lib/adminFontPairings';
import type { AdminThemeFontDto } from '@/lib/api/types';

const PAIRING: AdminFontPairingDto = {
    id: 'p1',
    name: 'Classic',
    titleFont: "'Playfair Display',serif",
    bodyFont: 'Lora,serif',
    buttonFont: null,
    hidden: false,
    sortOrder: 2,
    eventTypes: ['BAPTISM', 'WEDDING'],
};

const UPLOADED: AdminThemeFontDto = {
    id: 'f1',
    key: 'theos',
    familyName: 'Theos',
    fallback: 'serif',
    library: 'INVITATION',
    archived: false,
    url: '/api/theme-fonts/theos/1.woff2',
    presetCount: 0,
    invitationEventTypes: [],
};

describe('draftFromPairing', () => {
    it('starts a new pairing on one font for title and text, buttons on the text font', () => {
        expect(draftFromPairing(null)).toEqual({
            name: '',
            titleFont: 'Georgia,serif',
            bodyFont: 'Georgia,serif',
            buttonFont: '',
            hidden: false,
            eventTypes: [],
        });
    });

    it('copies a saved pairing', () => {
        expect(draftFromPairing(PAIRING)).toMatchObject({ name: 'Classic', buttonFont: '', eventTypes: ['BAPTISM', 'WEDDING'] });
    });
});

describe('validateFontPairingDraft', () => {
    it('needs a name of 1 to 100 characters', () => {
        expect(validateFontPairingDraft({ ...draftFromPairing(PAIRING), name: ' ' })).toEqual({ name: true });
        expect(validateFontPairingDraft({ ...draftFromPairing(PAIRING), name: 'x'.repeat(101) })).toEqual({ name: true });
        expect(validateFontPairingDraft({ ...draftFromPairing(PAIRING), name: 'x'.repeat(100) })).toEqual({});
    });
});

describe('buildFontPairingCreate', () => {
    it('sends every field, the name trimmed, and the place it takes in the list', () => {
        expect(buildFontPairingCreate({ ...draftFromPairing(PAIRING), name: ' Classic ' }, 3)).toEqual({
            name: 'Classic',
            titleFont: "'Playfair Display',serif",
            bodyFont: 'Lora,serif',
            buttonFont: '',
            hidden: false,
            sortOrder: 3,
            eventTypes: ['BAPTISM', 'WEDDING'],
        });
    });
});

describe('buildFontPairingPatch', () => {
    it('sends nothing for an unchanged draft', () => {
        expect(buildFontPairingPatch(PAIRING, draftFromPairing(PAIRING))).toEqual({});
    });

    it('sends only what changed', () => {
        const draft = { ...draftFromPairing(PAIRING), buttonFont: 'Cinzel,serif', hidden: true, eventTypes: [] };
        expect(buildFontPairingPatch(PAIRING, draft)).toEqual({ buttonFont: 'Cinzel,serif', hidden: true, eventTypes: [] });
    });

    it('clears the button font with an empty value', () => {
        expect(buildFontPairingPatch({ ...PAIRING, buttonFont: 'Cinzel,serif' }, draftFromPairing(PAIRING))).toEqual({ buttonFont: '' });
    });
});

describe('fontPairingFontOptions', () => {
    it("offers the editor's fonts, then Save my date's ready uploads", () => {
        const options = fontPairingFontOptions([UPLOADED, { ...UPLOADED, id: 'f2', familyName: 'Old', archived: true }, { ...UPLOADED, id: 'f3', familyName: 'Empty', url: null }]);
        expect(options[0]).toEqual({ value: 'Georgia,serif', label: 'Georgia' });
        expect(options.at(-1)).toEqual({ value: "'Theos',serif", label: 'Theos' });
        expect(options.map((option) => option.label)).not.toContain('Old');
        expect(options.map((option) => option.label)).not.toContain('Empty');
    });

    it('keeps a saved font no list has any more', () => {
        const options = fontPairingFontOptions([], ["'Old',serif", "'Playfair Display', serif"]);
        expect(options.at(-1)).toEqual({ value: "'Old',serif", label: 'Old' });
        expect(options.filter((option) => option.label === 'Playfair Display')).toHaveLength(1);
    });
});

describe('matchingFontValue', () => {
    it('finds the option a stored value names, whatever its spacing', () => {
        const options = fontPairingFontOptions([]);
        expect(matchingFontValue(options, "'Playfair Display', serif")).toBe("'Playfair Display',serif");
        expect(matchingFontValue(options, '')).toBe('');
    });
});

describe('fontPairingFontLabel', () => {
    it('shows the first family', () => {
        expect(fontPairingFontLabel("'Playfair Display',serif")).toBe('Playfair Display');
        expect(fontPairingFontLabel(null)).toBe('');
    });
});
