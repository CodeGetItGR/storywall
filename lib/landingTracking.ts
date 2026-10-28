import { track } from '@vercel/analytics';

import { sendCampaignClick } from '@/lib/campaignVisits';
import { trackAnalyticsEvent } from '@/lib/googleAnalytics';

// Landing page clicks and scroll depth, sent as Vercel Web Analytics custom events and mirrored to
// Google Analytics (only with the visitor's Analytics consent). Create, Plans and plan clicks also go
// to the campaign counter (lib/campaignVisits.ts). Vercel's Pro plan keeps at most two properties per
// event, so no event here carries more.

export type LandingPlacement = 'header' | 'mobile_menu' | 'hero' | 'hero_band' | 'stories' | 'themes' | 'demo' | 'final_cta';

export type LandingSection =
    'how_it_works' | 'stories' | 'demo' | 'social_host' | 'features' | 'feature_details' | 'reviews' | 'pricing' | 'faq' | 'final_cta' | 'footer';

export type LandingClick =
    | { event: 'create' | 'plans' | 'demo' | 'login'; placement: LandingPlacement }
    | { event: 'nav'; placement: LandingPlacement; target: string }
    | { event: 'plan'; plan: string; months: number };

const CLICK_EVENT_NAMES: Record<LandingClick['event'], string> = {
    create: 'Landing Create',
    plans: 'Landing Plans',
    demo: 'Landing Demo',
    login: 'Landing Login',
    nav: 'Landing Nav',
    plan: 'Landing Plan',
};

const CLICK_ATTRIBUTE = 'data-landing-click';
const SECTION_ATTRIBUTE = 'data-landing-section';
const FAQ_ATTRIBUTE = 'data-landing-faq';

export const LANDING_CLICK_SELECTOR = `[${CLICK_ATTRIBUTE}]`;
export const LANDING_SECTION_SELECTOR = `[${SECTION_ATTRIBUTE}]`;

// Spread onto a link: the landing page's click listener reads it back and sends the event.
export function landingClickAttributes(click: LandingClick) {
    return { [CLICK_ATTRIBUTE]: JSON.stringify(click) };
}

export function landingSectionAttributes(section: LandingSection) {
    return { [SECTION_ATTRIBUTE]: section };
}

// The question's 1-based position, read back when the visitor opens it.
export function landingFaqAttributes(position: number) {
    return { [FAQ_ATTRIBUTE]: String(position) };
}

export function readLandingClick(element: Element): LandingClick | null {
    const value = element.getAttribute(CLICK_ATTRIBUTE);
    if (!value) return null;
    try {
        return JSON.parse(value) as LandingClick;
    } catch {
        return null;
    }
}

export function readLandingSection(element: Element): LandingSection | null {
    return element.getAttribute(SECTION_ATTRIBUTE) as LandingSection | null;
}

export function readLandingFaqPosition(element: Element): number | null {
    const position = Number(element.getAttribute(FAQ_ATTRIBUTE));
    return Number.isInteger(position) && position > 0 ? position : null;
}

// The nav's anchors, named like the section events so both read the same in the dashboard.
const NAV_TARGETS: Record<string, LandingSection> = {
    '#platformStories': 'stories',
    '#howItWorks': 'how_it_works',
    '#experience': 'features',
    '#pricing': 'pricing',
};

export function landingNavTarget(href: string): LandingSection | string {
    return NAV_TARGETS[href] ?? href.replace(/^#/, '');
}

// Google Analytics gets the same event under a snake_case name: 'Landing Plan' is landing_plan.
function sendLandingEvent(name: string, properties: Record<string, string | number>) {
    track(name, properties);
    trackAnalyticsEvent(name.toLowerCase().replaceAll(' ', '_'), properties);
}

// The clicks Spring's campaign counter also counts, once per visitor and day.
const CAMPAIGN_CLICKS: Partial<Record<LandingClick['event'], 'CREATE' | 'PLANS' | 'PLAN'>> = {
    create: 'CREATE',
    plans: 'PLANS',
    plan: 'PLAN',
};

export function trackLandingClick(click: LandingClick) {
    const { event, ...properties } = click;
    sendLandingEvent(CLICK_EVENT_NAMES[event], properties);
    const campaignClick = CAMPAIGN_CLICKS[event];
    if (campaignClick) sendCampaignClick(campaignClick);
}

export function trackLandingSection(section: LandingSection) {
    sendLandingEvent('Landing Section', { section });
}

export function trackLandingFaq(position: number) {
    sendLandingEvent('Landing FAQ', { question: position });
}

export function trackLandingLanguage(locale: string) {
    sendLandingEvent('Landing Language', { locale });
}
