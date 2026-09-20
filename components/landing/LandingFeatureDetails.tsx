'use client';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { LandingFeatureDetailCard } from '@/components/landing/LandingFeatureDetailCard';
import { useLandingFeatureDetails } from '@/hooks/useLandingFeatureDetails';

export function LandingFeatureDetails() {
    const { activeDetail, availableDetails, endSwipe, selectedIndex, selectDetail, selectNext, selectPrevious, startSwipe, t, transitionDirection } =
        useLandingFeatureDetails();

    if (!activeDetail) return null;

    return (
        <section aria-labelledby="landing-feature-details-title" className="bg-[#0b0b0f] px-0 py-0 text-white min-[761px]:px-[5vw] min-[761px]:py-16">
            {/* Desktop feature cards */}
            <div className="hidden min-[761px]:block">
                {/* Feature introduction */}
                <div className="mx-auto max-w-155 text-center">
                    <p className="text-[13px] font-black tracking-[0.15em] text-[#f2c66a] uppercase">{t('eyebrow')}</p>
                    <h2
                        className="mt-4 font-(--editorial) text-[clamp(42px,4vw,62px)] leading-[0.95] tracking-[-0.045em]"
                        id="landing-feature-details-title"
                    >
                        {t('heading')}
                    </h2>
                </div>

                {/* Feature cards */}
                <div aria-label={t('label')} className="mx-auto mt-12 grid max-w-375 grid-cols-2 gap-6 min-[1440px]:grid-cols-4 min-[1440px]:gap-4.5">
                    {availableDetails.map((detail) => (
                        <LandingFeatureDetailCard {...detail} key={detail.title} />
                    ))}
                </div>
            </div>

            {/* Mobile feature panel */}
            <div className="overflow-hidden border border-[#0ea5b7] bg-[#0b0b0f] min-[761px]:hidden">
                {/* Feature introduction */}
                <div className="px-5 pt-6 min-[761px]:grid min-[761px]:grid-cols-12 min-[761px]:gap-x-10 min-[761px]:px-12 min-[761px]:pt-12">
                    <div className="min-[761px]:col-span-5">
                        <p className="text-[11px] leading-[1.05] font-black tracking-[0.15em] text-[#f2c66a] uppercase min-[761px]:text-[13px]">
                            {t('eyebrow')}
                        </p>
                    </div>
                    <h2
                        className="mt-4 font-(--editorial) text-[clamp(40px,4.4vw,68px)] leading-[0.95] tracking-[-0.055em] min-[761px]:col-span-7 min-[761px]:mt-0"
                        id="landing-feature-details-title"
                    >
                        {t('heading')}
                    </h2>
                </div>

                {/* Feature navigation */}
                <div
                    aria-label={t('label')}
                    className="mt-7 flex gap-7 overflow-x-auto px-5 pb-2 [-webkit-overflow-scrolling:touch] min-[761px]:mt-12 min-[761px]:gap-10 min-[761px]:px-12"
                    role="tablist"
                >
                    {availableDetails.map((detail, index) => (
                        <button
                            aria-controls="landing-feature-detail-panel"
                            aria-selected={selectedIndex === index}
                            className="relative shrink-0 pb-3 text-left text-[16px] leading-none font-black tracking-[0.02em] text-white/42 uppercase transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2c66a] aria-selected:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[#f2c66a] after:transition-transform after:duration-200 aria-selected:after:scale-x-100"
                            id={`landing-feature-tab-${index}`}
                            key={detail.title}
                            onClick={selectDetail(index)}
                            role="tab"
                            type="button"
                        >
                            {detail.title}
                        </button>
                    ))}
                </div>

                {/* Active feature */}
                <article
                    aria-labelledby={`landing-feature-tab-${selectedIndex}`}
                    className="landing-feature-detail-panel touch-pan-y min-[761px]:grid min-[761px]:grid-cols-2"
                    data-direction={transitionDirection}
                    id="landing-feature-detail-panel"
                    key={activeDetail.title}
                    onTouchEnd={endSwipe}
                    onTouchStart={startSwipe}
                    role="tabpanel"
                >
                    {/* Feature image */}
                    <div className="relative aspect-[1.06] overflow-hidden bg-white/5 min-[761px]:aspect-auto min-[761px]:min-h-145">
                        <ProtectedImage
                            alt={activeDetail.imageAlt}
                            className="size-full object-cover"
                            height={1000}
                            sizes="(max-width: 760px) 100vw, 50vw"
                            src={activeDetail.imagePath}
                            width={1200}
                        />
                    </div>

                    {/* Feature details */}
                    <div className="flex flex-col px-5 pt-8 pb-10 min-[761px]:justify-center min-[761px]:px-[clamp(2.5rem,5vw,7rem)] min-[761px]:py-14">
                        <h3 className="font-(--editorial) text-[clamp(42px,4vw,66px)] leading-[0.9] tracking-[-0.055em] text-white">
                            {activeDetail.title}
                        </h3>
                        <p className="mt-4 text-[16px] leading-[1.3] font-black text-[#f2c66a] min-[761px]:text-[18px]">{activeDetail.subtitle}</p>
                        <p className="mt-5 max-w-[39rem] text-[15px] leading-[1.55] text-white/86 min-[761px]:text-[16px]">
                            {activeDetail.description}
                        </p>
                        <ul className="mt-8 space-y-4 text-[15px] leading-[1.35] font-bold text-white min-[761px]:mt-10 min-[761px]:text-[16px]">
                            {activeDetail.items.map((item) => (
                                <li
                                    className="relative pl-6 before:absolute before:top-[0.5em] before:left-1 before:size-1.5 before:rounded-full before:bg-[#f2c66a] before:content-['']"
                                    key={item}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>

                        {/* Feature controls */}
                        <div className="mt-12 flex items-center justify-between gap-4 min-[761px]:mt-16">
                            <button
                                aria-label={t('previous')}
                                className="grid size-12 shrink-0 place-items-center rounded-full border border-white/25 text-xl text-white transition-colors duration-200 hover:border-[#f2c66a] hover:text-[#f2c66a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2c66a]"
                                onClick={selectPrevious}
                                type="button"
                            >
                                ←
                            </button>
                            <p className="text-center text-[10px] font-black tracking-[0.13em] text-white/60 uppercase">{t('interactionHint')}</p>
                            <button
                                aria-label={t('next')}
                                className="grid size-12 shrink-0 place-items-center rounded-full border border-white/25 text-xl text-white transition-colors duration-200 hover:border-[#f2c66a] hover:text-[#f2c66a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2c66a]"
                                onClick={selectNext}
                                type="button"
                            >
                                →
                            </button>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    );
}
