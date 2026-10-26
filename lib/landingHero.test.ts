import { describe, expect, it } from 'vitest';

import {
    LANDING_PRICING_HASH,
    landingHeroImageSizes,
    landingHeroMainAction,
    landingHeroSpriteSizes,
    nextTypewriterStep,
    TYPEWRITER_START,
} from '@/lib/landingHero';
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

describe('nextTypewriterStep', () => {
    it('types the first letter shortly after the start', () => {
        expect(nextTypewriterStep(TYPEWRITER_START, 4, 2)).toEqual({ cursor: { word: 0, length: 1, deleting: false }, delay: 140 });
    });

    it('types one letter at a time', () => {
        expect(nextTypewriterStep({ word: 0, length: 1, deleting: false }, 4, 2)).toEqual({
            cursor: { word: 0, length: 2, deleting: false },
            delay: 92,
        });
    });

    it('holds a full word before deleting it', () => {
        expect(nextTypewriterStep({ word: 0, length: 4, deleting: false }, 4, 2)).toEqual({
            cursor: { word: 0, length: 3, deleting: true },
            delay: 1342,
        });
    });

    it('deletes one letter at a time', () => {
        expect(nextTypewriterStep({ word: 0, length: 3, deleting: true }, 4, 2)).toEqual({
            cursor: { word: 0, length: 2, deleting: true },
            delay: 52,
        });
    });

    it('moves to the next word, and back to the first after the last', () => {
        expect(nextTypewriterStep({ word: 0, length: 0, deleting: true }, 4, 2)).toEqual({
            cursor: { word: 1, length: 1, deleting: false },
            delay: 312,
        });
        expect(nextTypewriterStep({ word: 1, length: 0, deleting: true }, 4, 2).cursor.word).toBe(0);
    });
});
