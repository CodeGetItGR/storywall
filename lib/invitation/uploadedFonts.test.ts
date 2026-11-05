import { describe, expect, it } from 'vitest';

import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

const font = (key: string, familyName: string, url = `/api/theme-fonts/${key}/1.woff2`): InvitationFontDto => ({
    key,
    familyName,
    fallback: 'serif',
    url,
});

describe('uploadedFontFaceCss', () => {
    it('declares only the fonts the invitation mentions', () => {
        const css = uploadedFontFaceCss([font('theos', 'Theos'), font('mouse', 'Mouse')], { fonts: { title: "'Theos', serif" } });

        expect(css).toBe('@font-face{font-family:"Theos";src:url("/api/theme-fonts/theos/1.woff2") format("woff2");font-display:swap;}');
    });

    it('finds a name in any letter case', () => {
        expect(uploadedFontFaceCss([font('theos', 'Theos')], { font: 'theos' })).toContain('font-family:"Theos"');
    });

    it('finds a font in rich text', () => {
        expect(uploadedFontFaceCss([font('old-standard', 'Old Standard')], { html: '<span style="font-family: Old Standard">x</span>' })).toContain(
            'font-family:"Old Standard"',
        );
    });

    it('declares nothing when no font is mentioned', () => {
        expect(uploadedFontFaceCss([font('theos', 'Theos')], { fonts: { title: 'Georgia, serif' } })).toBe('');
    });

    it('refuses a name or url that could break out of the rule', () => {
        const invitation = { fonts: 'x"}body{display:none} Theos ../other' };

        expect(uploadedFontFaceCss([font('bad-name', 'x"}body{display:none}')], invitation)).toBe('');
        expect(uploadedFontFaceCss([font('theos', 'Theos', '/api/theme-fonts/other/1.woff2')], invitation)).toBe('');
        expect(uploadedFontFaceCss([font('theos', 'Theos', 'https://elsewhere.test/a.woff2')], invitation)).toBe('');
    });
});
