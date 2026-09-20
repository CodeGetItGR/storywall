'use client';

import { useTranslations } from 'next-intl';

import { LandingFeatureItem } from '@/components/landing/LandingFeatureItem';
import { useLandingModuleGates } from '@/hooks/useLandingModuleGates';
import { LANDING_FEATURE_MODULE_KEYS } from '@/lib/landingFeatureGates';

const FEATURE_ICONS = [
    '/landing/decor-05.png',
    '/landing/decor-06.png',
    '/landing/decor-07.png',
    '/landing/decor-08.png',
    '/landing/decor-09.png',
    '/landing/decor-10.png',
    '/landing/decor-11.png',
    '/landing/decor-12.png',
    '/landing/decor-13.png',
    '/landing/decor-14.png',
    '/landing/decor-15.png',
    '/landing/decor-17.png',
] as const;

export function LandingFeatures() {
    const t = useTranslations('LandingPage.features');
    const labels = t.raw('items') as string[];
    const { isAvailable } = useLandingModuleGates();
    const features = labels.flatMap((label, index) =>
        isAvailable(LANDING_FEATURE_MODULE_KEYS[index] ?? null) ? [{ iconPath: FEATURE_ICONS[index]!, label, position: index }] : []
    );

    return (
        <section
            className="relative block bg-[radial-gradient(circle_at_15%_8%,rgba(150,48,118,0.18),transparent_38%),linear-gradient(180deg,#171419_0%,#101014_56%,#0b0b0f_100%)] pt-[52px] pr-5 pb-[clamp(58px,6vw,88px)] pl-5 text-white after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-12 after:bg-[linear-gradient(180deg,rgba(11,11,15,0),#0b0b0f)] after:content-[''] min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:gap-x-[5vw] min-[761px]:gap-y-0 min-[761px]:bg-[radial-gradient(circle_at_18%_10%,rgba(150,48,118,0.2),transparent_34%),linear-gradient(180deg,#171419_0%,#111014_55%,#0b0b0f_100%)] min-[761px]:pt-20 min-[761px]:pr-[5vw] min-[761px]:pl-[5vw]"
            id="experience"
        >
            {/* Eyebrow + heading */}
            <div className="m-0 text-[13px] font-black tracking-[0.15em] text-white/62 uppercase min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-[22px] min-[761px]:pt-0">
                {t('eyebrow')}
            </div>
            <h2 className="m-0 mt-[26px] text-[clamp(46px,12vw,66px)] leading-[0.89] font-normal tracking-normal text-white [font-family:var(--editorial)] min-[761px]:col-start-2 min-[761px]:row-start-2 min-[761px]:mt-0 min-[761px]:max-w-[980px] min-[761px]:text-[clamp(43.5px,4.8vw,81px)]">
                {t('heading')}
            </h2>
            {/* Feature icon strip */}
            <div className="sw-feature-block mt-[42px] w-full min-[761px]:col-span-2 min-[761px]:row-start-3 min-[761px]:mx-auto min-[761px]:mt-[clamp(52px,5.2vw,76px)] min-[761px]:w-[min(88%,1480px)] min-[761px]:max-w-[1480px]">
                <div
                    aria-label={t('label')}
                    className="relative w-full overflow-hidden pb-2 max-[760px]:ml-[calc(50%-50vw)] max-[760px]:mr-[calc(50%-50vw)] max-[760px]:w-screen max-[760px]:max-w-none min-[761px]:overflow-visible"
                >
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 bottom-[12px] left-0 z-[3] hidden w-[34px] bg-[linear-gradient(90deg,#171419_0%,rgba(23,20,25,0)_100%)] max-[760px]:block"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 bottom-[12px] z-[3] hidden w-[34px] bg-[linear-gradient(270deg,#0b0b0f_0%,rgba(11,11,15,0)_100%)] max-[760px]:block"
                    />
                    <div
                        className="sw-feature-track flex items-start gap-[18px] overflow-x-auto overflow-y-hidden px-5 pt-2 pb-5 [-webkit-overflow-scrolling:touch] [scroll-behavior:auto] [scroll-snap-type:none] [touch-action:pan-x] min-[761px]:w-full min-[761px]:max-w-none min-[761px]:flex-wrap min-[761px]:justify-center min-[761px]:gap-[clamp(34px,3vw,48px)_clamp(24px,2.2vw,34px)] min-[761px]:overflow-visible min-[761px]:px-0 min-[761px]:py-0"
                        role="list"
                        tabIndex={0}
                    >
                        {features.map((feature) => (
                            <LandingFeatureItem iconPath={feature.iconPath} key={feature.label} label={feature.label} position={feature.position} />
                        ))}
                        {features.map((feature, index) => (
                            <LandingFeatureItem
                                clone
                                iconPath={feature.iconPath}
                                key={`clone-${feature.label}`}
                                label={feature.label}
                                position={features.length + index}
                            />
                        ))}
                    </div>
                    <button
                        aria-label={t('previous')}
                        className="sw-feature-mobile-arrow-left absolute top-[46px] left-[10px] z-[8] block size-[34px] -translate-y-1/2 rounded-full bg-[rgba(10,10,14,0.28)] opacity-[0.72] transition-[opacity,background-color,transform] duration-[250ms] ease-[ease] before:absolute before:top-1/2 before:left-1/2 before:size-2 before:-translate-x-[42%] before:-translate-y-1/2 before:-rotate-[135deg] before:border-t-2 before:border-r-2 before:border-white/82 before:content-[''] active:scale-[0.94] active:bg-[rgba(10,10,14,0.34)] active:opacity-100 min-[761px]:hidden"
                        type="button"
                    />
                    <button
                        aria-label={t('next')}
                        className="sw-feature-mobile-arrow-right absolute top-[46px] right-[10px] z-[8] block size-[34px] -translate-y-1/2 rounded-full bg-[rgba(10,10,14,0.28)] opacity-[0.72] transition-[opacity,background-color,transform] duration-[250ms] ease-[ease] before:absolute before:top-1/2 before:left-1/2 before:size-2 before:-translate-x-[58%] before:-translate-y-1/2 before:rotate-45 before:border-t-2 before:border-r-2 before:border-white/82 before:content-[''] active:scale-[0.94] active:bg-[rgba(10,10,14,0.34)] active:opacity-100 min-[761px]:hidden"
                        type="button"
                    />
                </div>
            </div>
        </section>
    );
}
