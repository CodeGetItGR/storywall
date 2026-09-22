import { getTranslations } from 'next-intl/server';

export async function LandingHeroTransition() {
    const t = await getTranslations('LandingPage.transition');

    return (
        /* Hero-to-demo transition */
        <section
            aria-label={t('label')}
            className="relative z-20 min-h-47 w-full isolate overflow-hidden bg-[linear-gradient(90deg,rgba(255,111,145,0.6)_0%,rgba(255,143,111,0.6)_28%,rgba(247,183,91,0.6)_58%,rgba(248,210,92,0.6)_100%)] text-[#151313] after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:top-0 after:z-10 after:bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.14)_50%,rgba(255,255,255,0.28)_60%,rgba(255,255,255,0.46)_70%,rgba(255,255,255,0.66)_80%,rgba(255,255,255,0.85)_90%,rgb(255,255,255)_100%)] after:content-[''] min-[761px]:min-h-44"
        >
            <div className="relative z-20 mx-auto flex min-h-47 w-[calc(100%-34px)] items-center justify-between gap-3.5 min-[421px]:justify-center min-[421px]:gap-4.5 min-[761px]:items-start min-[761px]:pt-10 min-[761px]:min-h-54 min-[761px]:w-[min(1500px,calc(100%-120px))] min-[761px]:gap-7">
                <div className="m-0 max-w-34.5 [font-family:var(--editorial)] text-[19px] leading-[1.05] tracking-[-0.03em] min-[421px]:max-w-none min-[421px]:whitespace-nowrap min-[421px]:text-[21px] min-[761px]:text-[clamp(27px,2vw,42px)] min-[761px]:leading-[1.04] min-[761px]:tracking-[-0.035em] min-[761px]:mb-5">
                    {t('slogan')} <strong className="font-bold">{t('brand')}</strong>
                </div>
                <a
                    className="group flex min-h-12.5 flex-none items-center gap-2.5 rounded-full bg-white py-0 pr-3.75 pl-4.25 font-[Arial,Helvetica,sans-serif] text-[10px] leading-normal font-black tracking-widest whitespace-nowrap text-[#151313] no-underline transition-[transform,background] duration-280 ease-[ease] hover:-translate-y-px hover:bg-black motion-reduce:transition-none min-[421px]:min-h-13.5 min-[421px]:gap-3.25 min-[421px]:pr-4.5 min-[421px]:pl-5.25 min-[421px]:text-[11px] min-[761px]:min-h-17 min-[761px]:gap-5.5 min-[761px]:pr-7 min-[761px]:pl-8 min-[761px]:text-[13px] min-[761px]:tracking-[0.13em]"
                    href="#demo"
                >
                    <span>{t('cta')}</span>
                    <span
                        aria-hidden="true"
                        className="text-[21px] leading-none transition-transform duration-280 ease-[ease] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none min-[761px]:text-[25px]"
                    >
                        ↗
                    </span>
                </a>
            </div>
        </section>
    );
}
