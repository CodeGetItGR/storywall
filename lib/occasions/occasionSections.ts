// The sections an occasion page's header links to. howItWorks, pricing and faq are the ids the
// shared landing sections render.
export const OCCASION_SECTION_IDS = {
    howItWorks: 'howItWorks',
    features: 'features',
    pricing: 'pricing',
    faq: 'faq',
} as const;

// The header's links on an occasion page. nav and mobileNav are LandingPage.hero.nav and mobileNav:
// [home, how it works, features, plans, sign in]; the header shows sign in on its own.
export function occasionHeaderLinks(nav: string[], mobileNav: string[], faqLabel: string) {
    return [
        { href: `#${OCCASION_SECTION_IDS.howItWorks}`, label: nav[1]!, mobileLabel: mobileNav[1]! },
        { href: `#${OCCASION_SECTION_IDS.features}`, label: nav[2]!, mobileLabel: mobileNav[2]! },
        { href: `#${OCCASION_SECTION_IDS.pricing}`, label: nav[3]!, mobileLabel: mobileNav[3]! },
        { href: `#${OCCASION_SECTION_IDS.faq}`, label: faqLabel, mobileLabel: faqLabel },
    ];
}
