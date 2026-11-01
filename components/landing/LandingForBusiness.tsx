import { Eye, Link2, Sparkles, TicketPercent } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingForBusinessCard } from '@/components/landing/LandingForBusinessCard';
import { GradientIcon, GradientIconDefs } from '@/components/vendorPages/GradientIcon';
import { TYPE_ICONS } from '@/components/vendorPages/vendorPageIcons';
import { GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getVendorPagePath, VENDOR_PAGE_TYPES } from '@/i18n/publicLocale';
import { LANDING_TOKENS_CLASS } from '@/lib/landingTokens';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';
import { VENDOR_PAGES } from '@/lib/vendorPages';

// One icon per LandingPage.forBusiness.points item, in order.
const POINT_ICONS = [Link2, Eye, TicketPercent];

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
                    <div className="relative">
                        <ProtectedImage
                            alt={alts('heartEyes')}
                            className="absolute -top-9 right-0 size-14 rotate-12 min-[761px]:-top-12 min-[761px]:size-18 min-[1000px]:right-10"
                            height={440}
                            src="/landing/sw-scene-item-sw-love.webp"
                            width={441}
                        />
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
                <ul className="-mx-5 mt-12 flex list-none snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] min-[761px]:mt-16 min-[1000px]:mx-0 min-[1000px]:grid min-[1000px]:grid-cols-4 min-[1000px]:gap-5 min-[1000px]:overflow-visible min-[1000px]:px-0 min-[1000px]:pb-0 [&::-webkit-scrollbar]:hidden">
                    {VENDOR_PAGE_TYPES.map((type) => (
                        <LandingForBusinessCard
                            body={t(`highlights.${type}`)}
                            href={getVendorPagePath(type, locale)}
                            icon={TYPE_ICONS[type]}
                            key={type}
                            title={types(`${type}.label`)}
                        >
                            <ProtectedImage
                                fill
                                alt={types(`${type}.imageAlt`)}
                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
                                sizes="(min-width: 1000px) 25vw, (min-width: 761px) 34vw, 72vw"
                                src={VENDOR_PAGES[type].heroImage}
                            />
                            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-[#151313]/85 via-[#151313]/20 to-transparent" />
                        </LandingForBusinessCard>
                    ))}
                    {/* The business page */}
                    <LandingForBusinessCard
                        body={t('allBody')}
                        className="bg-[linear-gradient(125deg,#3b2529,#2e2328,#302523,#402a26)]"
                        href={getForBusinessPath(locale)}
                        icon={Sparkles}
                        title={t('all')}
                    >
                        <ProtectedImage
                            alt={alts('sparkle')}
                            className="absolute top-1/2 right-[-4%] w-[44%] -translate-y-[58%] rotate-12 opacity-90"
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
