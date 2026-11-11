import { routes } from '@/lib/routes';

// The phone create button on public pages watches two marks on the page: the hero's main button,
// which carries the page's own create link (an occasion's carries its type), and the final call to
// action. Plain data attributes, so the marked links keep their text, classes and hrefs.
const HERO_CREATE_ATTRIBUTE = 'data-hero-create';
const FINAL_CTA_ATTRIBUTE = 'data-final-cta';

export const HERO_CREATE_SELECTOR = `[${HERO_CREATE_ATTRIBUTE}]`;
// LandingFinalCta already carries its tracking section; other final calls to action get the mark.
export const FINAL_CTA_SELECTOR = `[data-landing-section="final_cta"], [${FINAL_CTA_ATTRIBUTE}]`;

export function heroCreateAttributes(createHref: string = routes.events.new()) {
    return { [HERO_CREATE_ATTRIBUTE]: createHref };
}

export function finalCtaAttributes() {
    return { [FINAL_CTA_ATTRIBUTE]: '' };
}

// The create link the hero names, or the plain create page.
export function readHeroCreateHref(element: Element): string {
    return element.getAttribute(HERO_CREATE_ATTRIBUTE) || routes.events.new();
}
