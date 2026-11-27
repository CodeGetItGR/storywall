import { describe, expect, it } from 'vitest';

import { wallThemeDesign } from '@/lib/feedLayout';
import { feedTopArt } from '@/lib/feedTopArt';
import { SAMPLE_THEME } from '@/lib/invitation/samples';

describe('feedTopArt', () => {
    it("is the theme's top illustration, at its size and with its movement", () => {
        const theme = { ...SAMPLE_THEME, art: { main: { image: { mediaId: 'm-art' }, scale: 2.5, animation: 'zoom' as const } } };
        expect(feedTopArt({ theme, media: (id) => `/${id}.png` })).toEqual({ src: '/m-art.png', scale: 2.5, animation: 'zoom' });
    });

    it('is null on the wall theme, and without its image', () => {
        expect(feedTopArt({ theme: wallThemeDesign(null), media: () => '/a.png' })).toBeNull();
        expect(feedTopArt({ theme: SAMPLE_THEME, media: () => undefined })).toBeNull();
    });
});
