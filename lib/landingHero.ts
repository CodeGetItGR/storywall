import type { LandingClick } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';

export type LandingHeroMainAction = {
    href: string;
    // Down for a jump to the plans on this page, up-right for leaving it.
    arrow: '↓' | '↗';
    click: LandingClick;
};

export const LANDING_PRICING_HASH = '#pricing';

// Signed-out visitors see the plans and their prices before anything asks them to log in. Signed-in
// visitors go straight to their account, as before.
export function landingHeroMainAction(isSignedIn: boolean): LandingHeroMainAction {
    return isSignedIn
        ? { href: routes.home, arrow: '↗', click: { event: 'create', placement: 'hero' } }
        : { href: LANDING_PRICING_HASH, arrow: '↓', click: { event: 'plans', placement: 'hero' } };
}

// The hero visual is 137vw wide on phones and min(780px, 43vw) from 761px up (HERO_VISUAL_CLASS in
// LandingHeroVisual). Each image inside it takes a share of that width.
const HERO_VISUAL_PHONE_VW = 137;
const HERO_VISUAL_DESKTOP_VW = 43;
const HERO_VISUAL_DESKTOP_MAX_PX = 780;

const round = (value: number) => Math.ceil(value * 10) / 10;

// The `sizes` for an image drawn at these shares of the hero visual's width, so phones and desktops
// download a copy near the size they draw instead of the full file.
export function landingHeroImageSizes(phoneShare: number, desktopShare: number): string {
    const desktop = `min(${round(HERO_VISUAL_DESKTOP_MAX_PX * desktopShare)}px, ${round(HERO_VISUAL_DESKTOP_VW * desktopShare)}vw)`;
    return `(min-width: 761px) ${desktop}, ${round(HERO_VISUAL_PHONE_VW * phoneShare)}vw`;
}

// Reads the phone and desktop widths, `w-[N%]` and `min-[761px]:w-[N%]`, from a sprite's position class.
export function landingHeroSpriteSizes(posClass: string): string {
    const phone = /(?:^|\s)w-\[([\d.]+)%\]/.exec(posClass);
    const desktop = /(?:^|\s)min-\[761px\]:w-\[([\d.]+)%\]/.exec(posClass);
    if (!phone || !desktop) throw new Error(`Hero sprite has no phone or desktop width: ${posClass}`);
    return landingHeroImageSizes(Number(phone[1]) / 100, Number(desktop[1]) / 100);
}

// Where the hero's typewriter is: which word, how many of its letters show, and whether it is deleting.
export type TypewriterCursor = { word: number; length: number; deleting: boolean };

export const TYPEWRITER_START: TypewriterCursor = { word: 0, length: 0, deleting: false };

// Milliseconds before each step, matching the design's typewriter.
const TYPEWRITER_FIRST_LETTER_MS = 140;
const TYPEWRITER_TYPE_MS = 92;
const TYPEWRITER_HOLD_MS = 92 + 1250;
const TYPEWRITER_DELETE_MS = 52;
const TYPEWRITER_NEXT_WORD_MS = 52 + 260;

// The typewriter's next position and how long to wait before moving to it. It types a word, holds it,
// deletes it, then types the next one, looping back to the first after the last.
export function nextTypewriterStep(cursor: TypewriterCursor, wordLength: number, wordCount: number): { cursor: TypewriterCursor; delay: number } {
    const { word, length, deleting } = cursor;
    if (deleting && length === 0) {
        return { cursor: { word: (word + 1) % wordCount, length: 1, deleting: false }, delay: TYPEWRITER_NEXT_WORD_MS };
    }
    if (deleting) return { cursor: { word, length: length - 1, deleting }, delay: TYPEWRITER_DELETE_MS };
    if (length === wordLength) return { cursor: { word, length: length - 1, deleting: true }, delay: TYPEWRITER_HOLD_MS };
    return { cursor: { word, length: length + 1, deleting }, delay: length === 0 ? TYPEWRITER_FIRST_LETTER_MS : TYPEWRITER_TYPE_MS };
}
