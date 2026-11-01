import { Eye, Link2, Sparkles, TicketPercent } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingForBusinessCard } from '@/components/landing/LandingForBusinessCard';
import { GradientIcon, GradientIconDefs } from '@/components/vendorPages/GradientIcon';
import { ALWAYS_ICONS, TOOL_ICONS, TYPE_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getVendorPagePath, VENDOR_PAGE_TYPES, type VendorPageType } from '@/i18n/publicLocale';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';
import { VENDOR_PAGES } from '@/lib/vendorPages';

// One icon per LandingPage.forBusiness.points item, in order.
const POINT_ICONS = [Link2, Eye, TicketPercent];

// A card's small icon row: the type's tools, or what every vendor gets when it has none. Skips the card's own icon.
function vendorCardIcons(type: VendorPageType) {
    const tools = VENDOR_PAGES[type].tools.map((tool) => TOOL_ICONS[tool]).filter((icon) => icon !== TYPE_ICONS[type]);
    return tools.length > 0 ? tools : [ALWAYS_ICONS.listing, ALWAYS_ICONS.posts, ALWAYS_ICONS.reach];
}

// Points professionals to their vendor page. Hidden wherever the vendor pages are.
export async function LandingForBusiness() {
    if (!showsUnreleasedPages()) return null;
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('LandingPage.forBusiness');
    const types = await getTranslations('VendorPages.types');
    const alts = await getTranslations('LandingPage.imageAlts');
    const points = t.raw('points') as string[];

    return (
        /* For businesses */
        <section
            aria-labelledby="landing-business-title"
            className={`${LANDING_TOKENS_CLASS} overflow-hidden bg-[#f4f0e8] bg-[radial-gradient(circle_at_92%_6%,rgba(248,165,96,0.22),transparent_38%),radial-gradient(circle_at_4%_96%,rgba(210,123,155,0.16),transparent_40%)] px-5 py-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:py-24`}
            id="for-business"
        >
            <GradientIconDefs />
            <div className="mx-auto w-full max-w-295">
                <div className="grid gap-9 min-[1000px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] min-[1000px]:items-end min-[1000px]:gap-16">
                    {/* Heading */}
                    <div>
                        <h2
                            className="m-0 max-w-[13ch] [font-family:var(--editorial)] text-[clamp(42px,11.5vw,60px)] leading-[.95] font-normal tracking-[-.05em] min-[761px]:text-[clamp(52px,5.2vw,78px)]"
                            id="landing-business-title"
                        >
                            {t('heading.plain')} <span className={GRADIENT_TEXT}>{t('heading.grad')}</span>
                        </h2>
                        <p className="m-0 mt-5 max-w-[46ch] text-[15px] leading-[1.55] text-[#151313]/80 min-[761px]:text-base">{t('body')}</p>
                    </div>
                    {/* What professionals get */}
                    <ul className="m-0 flex list-none flex-col gap-4 p-0">
                        {points.map((point, index) => (
                            <li key={point} className="flex items-center gap-3.5 text-[15px] font-semibold">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
                                    <GradientIcon icon={POINT_ICONS[index]!} className="size-5" />
                                </span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Vendor pages */}
                <ul className="m-0 mt-12 grid list-none grid-cols-2 gap-3 p-0 min-[761px]:mt-16 min-[761px]:grid-cols-4 min-[761px]:gap-5">
                    {VENDOR_PAGE_TYPES.map((type) => (
                        <LandingForBusinessCard
                            href={getVendorPagePath(type, locale)}
                            icon={TYPE_ICONS[type]}
                            key={type}
                            more={t('more')}
                            title={types(`${type}.label`)}
                            tools={vendorCardIcons(type)}
                        />
                    ))}
                    {/* The business page */}
                    <LandingForBusinessCard dark href={getForBusinessPath(locale)} icon={Sparkles} more={t('more')} title={t('all')}>
                        <ProtectedImage
                            alt={alts('sparkle')}
                            className="absolute -top-3 -right-2 w-14 rotate-12 opacity-90 min-[761px]:w-18"
                            height={181}
                            src="/landing/sw-scene-item-sw-flash.webp"
                            width={124}
                        />
                    </LandingForBusinessCard>
                </ul>
            </div>
        </section>
    );
}
