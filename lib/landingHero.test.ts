import { describe, expect, it } from 'vitest';

import { LANDING_PRICING_HASH, landingHeroImageSizes, landingHeroMainAction, landingHeroSpriteSizes } from '@/lib/landingHero';
import { routes } from '@/lib/routes';

describe('landingHeroMainAction', () => {
    it('sends signed-out visitors to the plans on the page', () => {
        expect(landingHeroMainAction(false)).toEqual({
            href: LANDING_PRICING_HASH,
            arrow: '↓',
            click: { event: 'plans', placement: 'hero' },
        });
    });

    it('sends signed-in visitors to their account', () => {
        expect(landingHeroMainAction(true)).toEqual({
            href: routes.home,
            arrow: '↗',
            click: { event: 'create', placement: 'hero' },
        });
    });
});

describe('landingHeroImageSizes', () => {
    it('scales the hero visual width by the image share on phones and desktops', () => {
        expect(landingHeroImageSizes(0.5, 0.25)).toBe('(min-width: 761px) min(195px, 10.8vw), 68.5vw');
    });
});

describe('landingHeroSpriteSizes', () => {
    it('reads the phone and desktop widths from the position class', () => {
        expect(landingHeroSpriteSizes('absolute left-[1%] w-[50%] z-[4] min-[761px]:left-[2%] min-[761px]:w-[25%]')).toBe(
            landingHeroImageSizes(0.5, 0.25),
        );
    });

    it('fails loudly when a width is missing', () => {
        expect(() => landingHeroSpriteSizes('absolute w-[50%]')).toThrow();
    });
});
