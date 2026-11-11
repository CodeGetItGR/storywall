import { describe, expect, it } from 'vitest';

import { THEME_PUBLIC_DTO } from '@/lib/invitation/__fixtures__/themePublicDto';
import { invitationThemeEndpoint, previewThemeSlug, readThemePreview } from '@/lib/invitation/themePreview';

describe('The theme a preview link names', () => {
    it('is undefined without ?theme and the slug when it is one', () => {
        expect(previewThemeSlug({})).toBeUndefined();
        expect(previewThemeSlug({ theme: 'template-1-copy-4' })).toBe('template-1-copy-4');
    });

    it('is null for anything the backend could never have as a slug', () => {
        for (const theme of ['', 'Γάμος', 'a/b', '-a', 'a--b', 'A', 'a'.repeat(121)]) expect(previewThemeSlug({ theme })).toBeNull();
        expect(previewThemeSlug({ theme: ['a', 'b'] })).toBeNull();
    });

    it('is fetched from the public catalogue', () => {
        expect(invitationThemeEndpoint('template-1-copy-4')).toBe('/api/invitation-themes/template-1-copy-4');
    });
});

describe('Reading a theme for the renderer', () => {
    it("takes its design and starting invitation, and resolves its images from the theme's URLs", () => {
        const preview = readThemePreview(THEME_PUBLIC_DTO);
        expect(preview.theme.colors.primary).toBe('#c9a96e');
        expect(preview.document.sections.map((section) => section.type)).toEqual(['top', 'invitation', 'coupleNames', 'date', 'footer']);
        expect(preview.media('smd-top')).toBe('/images/venue.png');
        expect(preview.media('unknown')).toBeUndefined();
    });

    it('throws for a design the renderer cannot draw', () => {
        expect(() => readThemePreview({ ...THEME_PUBLIC_DTO, design: { colors: {} } })).toThrow();
    });
});
