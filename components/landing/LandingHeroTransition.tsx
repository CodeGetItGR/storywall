'use client';

import { useTranslations } from 'next-intl';

export function LandingHeroTransition() {
    const t = useTranslations('LandingPage.transition');

    return (
        /* Hero-to-demo transition */
        <section
            aria-label={t('label')}
            className="relative z-20 min-h-[188px] w-full overflow-hidden bg-[linear-gradient(90deg,rgba(255,111,145,0.6)_0%,rgba(255,143,111,0.6)_28%,rgba(247,183,91,0.6)_58%,rgba(248,210,92,0.6)_100%)] text-[#151313] isolate min-[761px]:min-h-[248px]"
            data-landing-hero-transition
        >
            <div className="mx-auto flex min-h-[188px] w-[calc(100%-34px)] items-center justify-center gap-[14px] pt-[22px] pb-[68px] min-[421px]:gap-[18px] min-[761px]:min-h-[248px] min-[761px]:w-[min(1500px,calc(100%-120px))] min-[761px]:items-start min-[761px]:gap-7 min-[761px]:pt-12 min-[761px]:pb-[88px]">
                <div className="m-0 whitespace-nowrap [font-family:var(--editorial)] text-[19px] leading-[1.05] tracking-[-0.03em] min-[421px]:text-[21px] min-[761px]:text-[clamp(27px,2vw,42px)] min-[761px]:leading-[1.04] min-[761px]:tracking-[-0.035em]">
                    {t('slogan')} <strong className="font-bold">{t('brand')}</strong>
                </div>
                <a
                    className="group flex min-h-[50px] flex-none items-center gap-2.5 rounded-full bg-white py-0 pr-[15px] pl-[17px] [font-family:Arial,Helvetica,sans-serif] text-[10px] leading-normal font-black tracking-[0.1em] whitespace-nowrap text-[#151313] no-underline transition-[transform,background] duration-[280ms] ease-[ease] hover:-translate-y-px hover:bg-black motion-reduce:transition-none min-[421px]:min-h-[54px] min-[421px]:gap-[13px] min-[421px]:pr-[18px] min-[421px]:pl-[21px] min-[421px]:text-[11px] min-[761px]:-mt-1.5 min-[761px]:min-h-[68px] min-[761px]:gap-[22px] min-[761px]:pr-7 min-[761px]:pl-8 min-[761px]:text-[13px] min-[761px]:tracking-[0.13em]"
                    href="#demo"
                >
                    <span>{t('cta')}</span>
                    <span
                        aria-hidden="true"
                        className="text-[21px] leading-none transition-transform duration-[280ms] ease-[ease] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none min-[761px]:text-[25px]"
                    >
                        ↗
                    </span>
                </a>
            </div>
        </section>
    );
}
