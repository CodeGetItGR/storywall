import { getTranslations } from 'next-intl/server';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingMotionToggle } from '@/components/landing/LandingMotionToggle';
import { LandingNewsletter } from '@/components/landing/LandingNewsletter';

// Every in-page anchor here must match an id rendered by a landing section.
const EXPLORE_LINKS = [
    { key: 'platform', href: '#platformStories' },
    { key: 'howItWorks', href: '#howItWorks' },
    { key: 'features', href: '#experience' },
    { key: 'plans', href: '#pricing' },
    { key: 'faq', href: '#faq' },
] as const;

const TOP_HREF = '#top-preview';

const COLUMN_HEADING = 'mb-5.5 text-[9px] font-black tracking-[0.16em] text-white/48';
const COLUMN_ITEM = 'py-1.5 text-[13px] leading-[1.35] text-white';

export async function LandingFooter() {
    const t = await getTranslations('LandingPage.footer');
    // Social profiles and legal pages have no destinations yet, so their
    // labels render as plain text rather than dead links.
    const socialLabels = t.raw('socialLinks') as string[];
    const legalLabels = t.raw('legal') as string[];

    return (
        <footer className="overflow-hidden bg-[#262626] px-5 pt-14.5 pb-6 text-white min-[761px]:px-[5vw] min-[761px]:pt-18.5">
            <div className="grid grid-cols-2 gap-x-6.5 gap-y-10.5 border-b border-white/14 pb-13.5 min-[761px]:grid-cols-[1.65fr_0.75fr_0.75fr] min-[761px]:gap-[5vw] min-[761px]:pb-19">
                {/* Brand */}
                <div className="col-span-2 min-[761px]:col-span-1">
                    <div className="w-[min(82vw,330px)] leading-none min-[761px]:w-[clamp(179px,19.6vw,301px)]">
                        <ProtectedImage
                            unoptimized
                            alt={t('imageAlt')}
                            src="/landing/storywall-2.webp"
                            width={600}
                            height={119}
                            loading="lazy"
                            className="block h-auto w-full object-contain"
                        />
                    </div>
                    <p className="mt-4 max-w-[320px] text-[13px] leading-[1.55] text-white/68 min-[761px]:mt-5 min-[761px]:text-sm">
                        {t('lineOne')}
                        <br />
                        {t('lineTwo')}
                    </p>
                    <LandingMotionToggle className="mt-3 text-[13px] text-white/68" />
                    {/* Newsletter */}
                    <LandingNewsletter heading={t('newsletter')} headingClassName={COLUMN_HEADING} />
                </div>
                {/* Explore */}
                <div className="flex flex-col items-start">
                    <div className={COLUMN_HEADING}>{t('explore')}</div>
                    {EXPLORE_LINKS.map(({ key, href }) => (
                        <a
                            className={`${COLUMN_ITEM} no-underline transition-[opacity,transform] duration-250 ease-[ease] hover:translate-x-0.75 hover:opacity-[0.62] motion-reduce:transition-none`}
                            href={href}
                            key={key}
                        >
                            {t(`exploreLinks.${key}`)}
                        </a>
                    ))}
                </div>
                {/* Social */}
                <div className="flex flex-col items-start">
                    <div className={COLUMN_HEADING}>{t('social')}</div>
                    {socialLabels.map((label) => (
                        <span className={COLUMN_ITEM} key={label}>
                            {label}
                        </span>
                    ))}
                </div>
            </div>
            {/* Wordmark */}
            <div className="box-border w-full overflow-visible pt-10.5 pb-6.5 [font-family:var(--editorial)] text-[clamp(52px,16.5vw,70px)] leading-[0.82] font-normal tracking-[-0.06em] whitespace-nowrap text-white min-[761px]:w-auto min-[761px]:pt-12.5 min-[761px]:pb-7.5 min-[761px]:text-[clamp(110px,17vw,310px)] min-[761px]:leading-[0.72] min-[761px]:tracking-[-0.075em]">
                STORYWALL
            </div>
            {/* Legal */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/16 pt-5.5 text-[9px] font-extrabold tracking-widest text-white/62 min-[761px]:grid-cols-[1fr_auto_1fr] min-[761px]:gap-6.5">
                <span>{t('copyright')}</span>
                <div className="col-span-2 row-start-2 flex flex-wrap gap-4.5 min-[761px]:col-span-1 min-[761px]:row-start-1">
                    {legalLabels.map((label) => (
                        <span key={label}>{label}</span>
                    ))}
                </div>
                <a className="justify-self-end text-white no-underline max-[760px]:col-start-2 max-[760px]:row-start-1" href={TOP_HREF}>
                    {t('backToTop')} ↑
                </a>
            </div>
        </footer>
    );
}
