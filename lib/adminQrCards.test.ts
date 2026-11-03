import { describe, expect, it } from 'vitest';

import {
    buildQrCardLookPatchPayload,
    buildQrCardTemplateCreatePayload,
    buildQrCardTemplatePatchPayload,
    codeContrastRatio,
    draftFromQrCardTemplate,
    filterQrCardTemplates,
    formatMm,
    isQrCardDetailError,
    lookDraftFromQrCardTemplate,
    QR_CARD_ARTWORK_MAX_BYTES,
    qrCardArtworkFileError,
    type QrCardLookDraft,
    type QrCardTemplateDraft,
    qrCardTemplateStatus,
    sortQrCardTemplates,
    validateQrCardLookDraft,
    validateQrCardTemplateDraft,
} from '@/lib/adminQrCards';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, AdminThemeFontSummaryDto } from '@/lib/api/types';

const ALEGREYA: AdminThemeFontSummaryDto = {
    id: 'f1',
    key: 'alegreya',
    familyName: 'Alegreya',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/alegreya/1.woff2',
};

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    artworkWidth: null,
};

const SAGE: AdminQrCardTemplateDto = { ...LINEN, id: 't2', name: { en: 'Sage', el: 'Φασκόμηλο' }, sortOrder: 1, artworkUrl: null };

function valid(overrides: Partial<QrCardTemplateDraft> = {}): QrCardTemplateDraft {
    return { ...draftFromQrCardTemplate(null), nameEn: 'Linen', nameEl: 'Λινό', eventTypes: ['WEDDING'], ...overrides };
}

function look(overrides: Partial<QrCardLookDraft> = {}): QrCardLookDraft {
    return { ...lookDraftFromQrCardTemplate(LINEN), ...overrides };
}

describe('draftFromQrCardTemplate', () => {
    it('starts a new design blank, offered', () => {
        expect(draftFromQrCardTemplate(null)).toEqual({ nameEn: '', nameEl: '', eventTypes: [], archived: false });
    });

    it('copies a saved design, and its look', () => {
        expect(draftFromQrCardTemplate(LINEN)).toMatchObject({ nameEn: 'Linen', eventTypes: ['WEDDING'] });
        expect(lookDraftFromQrCardTemplate({ ...LINEN, headingFont: ALEGREYA })).toEqual({
            textColor: '#5A3E2B',
            codeColor: '#1F3A5A',
            centerLogo: false,
            headingFontId: 'f1',
        });
    });
});

describe('validateQrCardTemplateDraft', () => {
    it('asks for both names and an event type', () => {
        expect(validateQrCardTemplateDraft(draftFromQrCardTemplate(null))).toEqual({ nameEn: true, nameEl: true, eventTypes: true });
    });

    it('caps names at 60 characters', () => {
        expect(validateQrCardTemplateDraft(valid({ nameEn: 'x'.repeat(61) }))).toEqual({ nameEn: true });
        expect(validateQrCardTemplateDraft(valid({ nameEn: 'x'.repeat(60) }))).toEqual({});
    });
});

describe('validateQrCardLookDraft', () => {
    it('needs #RRGGBB colours', () => {
        expect(validateQrCardLookDraft(look({ textColor: 'red', codeColor: '#12' }), LINEN.codeColor)).toEqual({ textColor: true, codeColor: true });
    });

    it('needs 4.5:1 for the code against white', () => {
        expect(codeContrastRatio('#767676')).toBeGreaterThanOrEqual(4.5);
        expect(validateQrCardLookDraft(look({ codeColor: '#767676' }), LINEN.codeColor)).toEqual({});
        expect(validateQrCardLookDraft(look({ codeColor: '#777777' }), LINEN.codeColor)).toEqual({ codeContrast: true });
    });

    it('lets a saved code colour stand while other fields change', () => {
        expect(validateQrCardLookDraft(look({ codeColor: '#777777' }), '#777777')).toEqual({});
    });
});

describe('buildQrCardTemplateCreatePayload', () => {
    it('sends trimmed names and Plain looks', () => {
        expect(buildQrCardTemplateCreatePayload(valid({ nameEn: ' Linen ' }), 4)).toEqual({
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING'],
            sortOrder: 4,
            textColor: '#241F1A',
            headingFontId: null,
            codeColor: '#241F1A',
            centerLogo: true,
        });
    });
});

describe('buildQrCardTemplatePatchPayload', () => {
    it('sends nothing when nothing changed', () => {
        expect(buildQrCardTemplatePatchPayload(LINEN, draftFromQrCardTemplate(LINEN))).toEqual({});
    });

    it('sends only what changed', () => {
        const draft: QrCardTemplateDraft = { ...draftFromQrCardTemplate(LINEN), nameEl: 'Λινάρι', archived: true };
        expect(buildQrCardTemplatePatchPayload(LINEN, draft)).toEqual({ name: { en: 'Linen', el: 'Λινάρι' }, archived: true });
    });
});

describe('buildQrCardLookPatchPayload', () => {
    it('sends nothing when nothing changed, whatever the colour case', () => {
        expect(buildQrCardLookPatchPayload(LINEN, look({ codeColor: '#1f3a5a' }))).toEqual({});
    });

    it('sends only what changed, colours in upper case', () => {
        expect(buildQrCardLookPatchPayload(LINEN, look({ textColor: '#2b2b2b', centerLogo: true }))).toEqual({
            textColor: '#2B2B2B',
            centerLogo: true,
        });
    });

    it('clears the font with a flag and sets a new one by id', () => {
        const withFont = { ...LINEN, headingFont: ALEGREYA };
        expect(buildQrCardLookPatchPayload(withFont, { ...lookDraftFromQrCardTemplate(withFont), headingFontId: '' })).toEqual({
            clearHeadingFont: true,
        });
        expect(buildQrCardLookPatchPayload(LINEN, look({ headingFontId: 'f2' }))).toEqual({ headingFontId: 'f2' });
    });
});

describe('qrCardTemplateStatus', () => {
    it('is archived, then without artwork, then live', () => {
        expect(qrCardTemplateStatus({ ...LINEN, archived: true, artworkUrl: null })).toBe('ARCHIVED');
        expect(qrCardTemplateStatus(SAGE)).toBe('NO_ARTWORK');
        expect(qrCardTemplateStatus(LINEN)).toBe('LIVE');
    });
});

describe('sortQrCardTemplates and filterQrCardTemplates', () => {
    it('sorts by order', () => {
        expect(sortQrCardTemplates([SAGE, LINEN]).map((template) => template.id)).toEqual(['t1', 't2']);
    });

    it('finds by name in the admin language, and by status', () => {
        expect(filterQrCardTemplates([LINEN, SAGE], 'φασκ', 'ALL', 'el').map((template) => template.id)).toEqual(['t2']);
        expect(filterQrCardTemplates([LINEN, SAGE], '', 'NO_ARTWORK', 'en').map((template) => template.id)).toEqual(['t2']);
    });
});

describe('isQrCardDetailError', () => {
    it("shows the server's detail for contrast, artwork and name rejections", () => {
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3110, detail: 'Too light.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3111, detail: 'Not A6.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3091, detail: 'Greek name missing.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3001, detail: 'Bad.', errors: {} }))).toBe(true);
    });

    it('leaves field errors and other failures to the generic message', () => {
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3001, errors: { codeColor: 'must match' } }))).toBe(false);
        expect(isQrCardDetailError(new ApiError(409, { errorCode: 5145 }))).toBe(false);
        expect(isQrCardDetailError(new Error('offline'))).toBe(false);
    });
});

describe('qrCardArtworkFileError', () => {
    const file = (type: string, size: number) => ({ type, size }) as File;

    it('takes PNG and WebP up to 10 MB', () => {
        expect(QR_CARD_ARTWORK_MAX_BYTES).toBe(10 * 1024 * 1024);
        expect(qrCardArtworkFileError(file('image/webp', 6 * 1024 * 1024))).toBeNull();
        expect(qrCardArtworkFileError(file('image/png', 10 * 1024 * 1024))).toBeNull();
    });

    it('refuses other types and larger files', () => {
        expect(qrCardArtworkFileError(file('image/jpeg', 100))).toBe('type');
        expect(qrCardArtworkFileError(file('image/png', 10 * 1024 * 1024 + 1))).toBe('size');
    });
});

describe('formatMm', () => {
    it('always shows one decimal, in the locale', () => {
        expect(formatMm(8, 'en')).toBe('8.0');
        expect(formatMm(10.5, 'el')).toBe('10,5');
    });
});
