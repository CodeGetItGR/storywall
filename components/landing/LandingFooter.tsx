'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

const EXPLORE_HREFS = ['#platform', '#journey', '#experience', '#pricing', '#faq'];

export function LandingFooter() {
    const t = useTranslations('LandingPage.footer');
    const exploreLinks = t.raw('exploreLinks') as string[];
    const eventLinks = t.raw('eventLinks') as string[];
    const socialLinks = t.raw('socialLinks') as string[];
    const legalLinks = t.raw('legal') as string[];

    return (
        <footer className="overflow-hidden bg-[#262626] px-5 pt-[58px] pb-6 text-white min-[761px]:px-[5vw] min-[761px]:pt-[74px]">
            <div className="grid grid-cols-2 gap-x-[26px] gap-y-[42px] border-b border-white/14 pb-[54px] min-[761px]:grid-cols-[1.65fr_0.75fr_0.75fr_0.75fr] min-[761px]:gap-[5vw] min-[761px]:pb-[76px]">
                <div className="col-span-2 min-[761px]:col-span-1">
                    <div className="w-[min(82vw,330px)] leading-none min-[761px]:w-[clamp(179px,19.6vw,301px)]">
                        <Image
                            alt={t('imageAlt')}
                            src="/landing/storywall-2.png"
                            width={600}
                            height={119}
                            unoptimized
                            className="block h-auto w-full object-contain"
                        />
                    </div>
                    <p className="mt-4 max-w-[320px] text-[13px] leading-[1.55] text-white/68 min-[761px]:mt-5 min-[761px]:text-sm">
                        {t('lineOne')}
                        <br />
                        {t('lineTwo')}
                    </p>
                </div>
                <div className="flex flex-col items-start">
                    <div className="mb-[22px] text-[9px] font-black tracking-[0.16em] text-white/48">{t('explore')}</div>
                    {exploreLinks.map((label, index) => (
                        <a
                            className="py-1.5 text-[13px] leading-[1.35] text-white no-underline transition-[opacity,transform] duration-[250ms] ease-[ease] hover:translate-x-[3px] hover:opacity-[0.62] motion-reduce:transition-none"
                            href={EXPLORE_HREFS[index]}
                            key={label}
                        >
                            {label}
                        </a>
                    ))}
                </div>
                <div className="flex flex-col items-start">
                    <div className="mb-[22px] text-[9px] font-black tracking-[0.16em] text-white/48">{t('events')}</div>
                    {eventLinks.map((label) => (
                        <a
                            className="py-1.5 text-[13px] leading-[1.35] text-white no-underline transition-[opacity,transform] duration-[250ms] ease-[ease] hover:translate-x-[3px] hover:opacity-[0.62] motion-reduce:transition-none"
                            href="#"
                            key={label}
                        >
                            {label}
                        </a>
                    ))}
                </div>
                <div className="flex flex-col items-start">
                    <div className="mb-[22px] text-[9px] font-black tracking-[0.16em] text-white/48">{t('social')}</div>
                    {socialLinks.map((label) => (
                        <a
                            className="py-1.5 text-[13px] leading-[1.35] text-white no-underline transition-[opacity,transform] duration-[250ms] ease-[ease] hover:translate-x-[3px] hover:opacity-[0.62] motion-reduce:transition-none"
                            href="#"
                            key={label}
                        >
                            {label} ↗
                        </a>
                    ))}
                </div>
            </div>
            <div className="w-full overflow-visible box-border pt-[42px] pb-[26px] text-[clamp(52px,16.5vw,70px)] leading-[0.82] tracking-[-0.06em] whitespace-nowrap text-white [font-family:var(--editorial)] font-normal min-[761px]:w-auto min-[761px]:pt-[50px] min-[761px]:pb-[30px] min-[761px]:text-[clamp(110px,17vw,310px)] min-[761px]:leading-[0.72] min-[761px]:tracking-[-0.075em]">
                STORYWALL
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/16 pt-[22px] text-[9px] font-extrabold tracking-[0.1em] text-white/62 min-[761px]:grid-cols-[1fr_auto_1fr] min-[761px]:gap-[26px]">
                <span>{t('copyright')}</span>
                <div className="col-span-2 row-start-2 flex gap-[18px] min-[761px]:col-span-1 min-[761px]:row-start-1">
                    {legalLinks.map((label) => (
                        <a className="text-inherit no-underline" href="#" key={label}>
                            {label}
                        </a>
                    ))}
                </div>
                <a
                    className="max-[760px]:col-start-2 max-[760px]:row-start-1 justify-self-end text-white no-underline"
                    href="#platformStories"
                >
                    {t('backToTop')} ↑
                </a>
            </div>
        </footer>
    );
}
