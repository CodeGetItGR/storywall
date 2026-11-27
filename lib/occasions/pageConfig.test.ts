import { describe, expect, it } from 'vitest';

import { occasionPageConfig } from '@/lib/occasions/pageConfig';
import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

describe('occasionPageConfig', () => {
    it('gives the wedding its demo, QR links and marquee', () => {
        expect(occasionPageConfig('WEDDING')).toEqual({ media: WEDDING_PAGE_MEDIA, demo: true, qrLinks: true, themes: false, guestPhotos: 'marquee' });
    });

    it('gives the baptism its themes and a still row of photos, without demo or QR links', () => {
        expect(occasionPageConfig('BAPTISM')).toEqual({ media: BAPTISM_PAGE_MEDIA, demo: false, qrLinks: false, themes: true, guestPhotos: 'row' });
    });

    it('leaves every other occasion on the old layout', () => {
        expect(occasionPageConfig('BIRTHDAY')).toBeNull();
    });
});
