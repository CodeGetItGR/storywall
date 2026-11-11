import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { type AdminInvitationThemeDto, BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import {
    applyTypographyPreset,
    clearSectionFontOverrides,
    readEditableTheme,
    setThemeFont,
    themeContentRequest,
    themeSaveMode,
} from '@/lib/invitation/themeEditing';
import { PREVIEW_THEME, previewDocument } from '@/lib/saveMyDatePreview';

function theme(overrides: Partial<AdminInvitationThemeDto> = {}): AdminInvitationThemeDto {
    return {
        id: 't1',
        eventType: 'WEDDING',
        status: 'DRAFT',
        name: 'Garden',
        slug: 'garden',
        code: 'W001',
        description: 'Old description',
        cardColor: '#ffffff',
        seoTitle: null,
        seoDescription: null,
        ogImageAssetId: 'og',
        cardThumbAssetId: null,
        productPhotos: [],
        sortOrder: 3,
        design: BLANK_THEME_DESIGN as unknown as Record<string, unknown>,
        document: blankThemeDocument('WEDDING', 'garden') as unknown as Record<string, unknown>,
        revision: 4,
        assets: [{ assetId: 'og', url: 'https://cdn.test/og.webp', contentType: 'image/webp', width: 10, height: 10, byteSize: 100 }],
        updatedAt: '2026-11-01T10:00:00Z',
        ...overrides,
    };
}

const PRESET = { id: 'p1', name: 'Classic', titleFont: 'Playfair Display', bodyFont: 'Lora', buttonFont: null };

describe('readEditableTheme', () => {
    it('reads the design, the document and the asset urls', () => {
        const editable = readEditableTheme(theme());
        expect(editable).toMatchObject({ id: 't1', status: 'DRAFT', eventType: 'WEDDING', revision: 4 });
        expect(editable.design.colors).toEqual(BLANK_THEME_DESIGN.colors);
        expect(editable.media('og')).toBe('https://cdn.test/og.webp');
        expect(editable.media('missing')).toBeUndefined();
    });

    it('throws on a design the editor cannot draw', () => {
        expect(() => readEditableTheme(theme({ design: { colors: 'red' } }))).toThrow();
    });
});

describe('themeSaveMode', () => {
    it('saves a draft as you go and waits for Save on live and hidden themes', () => {
        expect(themeSaveMode('DRAFT')).toBe('auto');
        expect(themeSaveMode('ACTIVE')).toBe('manual');
        expect(themeSaveMode('HIDDEN')).toBe('manual');
    });
});

describe('themeContentRequest', () => {
    it('sends the loaded details back with the edited content and revision', () => {
        const document = previewDocument();
        const request = themeContentRequest(theme(), { design: PREVIEW_THEME, document }, 7);
        expect(request).toMatchObject({ name: 'Garden', slug: 'garden', code: 'W001', ogImageAssetId: 'og', revision: 7, sortOrder: 3 });
        expect(request.design).toBe(PREVIEW_THEME);
        expect(request.document).toBe(document);
    });
});

describe('clearSectionFontOverrides', () => {
    it('removes every font a section chose and keeps the rest', () => {
        const sections = [
            { data: { titleFont: 'Lora', titleSize: 30, items: [{ font: 'Arial', text: 'a' }] } },
        ] as unknown as InvitationDocument['sections'];
        const cleared = produce(sections, (draft) => clearSectionFontOverrides(draft));
        expect(cleared).toEqual([{ data: { titleSize: 30, items: [{ text: 'a' }] } }]);
    });
});

describe('applyTypographyPreset', () => {
    it('sets the fonts from the pairing and clears section fonts', () => {
        const start = { theme: { ...PREVIEW_THEME, fonts: { ...PREVIEW_THEME.fonts, button: 'Arial' } }, document: previewDocument() };
        const withFont = produce(start, (draft) => {
            (draft.document.sections[0] as unknown as { data: Record<string, unknown> }).data.titleFont = 'Arial';
        });
        const next = produce(withFont, (draft) => applyTypographyPreset(draft.theme, draft.document, PRESET));
        expect(next.theme.typographyPresetId).toBe('p1');
        expect(next.theme.fonts).toEqual({ title: 'Playfair Display', body: 'Lora' });
        expect(JSON.stringify(next.document.sections)).not.toMatch(/font"/i);
    });

    it('keeps the pairing button font when it has one', () => {
        const next = produce(PREVIEW_THEME, (draft) => applyTypographyPreset(draft, produce(previewDocument(), () => {}), { ...PRESET, buttonFont: 'Lato' }));
        expect(next.fonts.button).toBe('Lato');
    });
});

describe('setThemeFont', () => {
    it('leaves the pairing when a font is picked by hand', () => {
        const next = produce({ ...PREVIEW_THEME, typographyPresetId: 'p1' }, (draft) => setThemeFont(draft, 'title', 'Arial'));
        expect(next.typographyPresetId).toBeUndefined();
        expect(next.fonts.title).toBe('Arial');
    });

    it('drops the button font when set back to the body font', () => {
        const next = produce({ ...PREVIEW_THEME, fonts: { ...PREVIEW_THEME.fonts, button: 'Arial' } }, (draft) => setThemeFont(draft, 'button', ''));
        expect(next.fonts.button).toBeUndefined();
    });
});
