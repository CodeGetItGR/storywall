'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import { useDurationPicks } from '@/hooks/useDurationPicks';
import { useLandingPricingCategory } from '@/hooks/useLandingPricingCategory';
import { useLandingPricingPlans } from '@/hooks/useLandingPricingPlans';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER = ['wedding', 'vip'] as const;

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const { categories } = useLandingPricingPlans();
    const { category, selectCategory, handleCategoryKeyDown } = useLandingPricingCategory();
    const { picks, pickDuration } = useDurationPicks();

    if (!categories) return null;

    return (
        <section
            aria-labelledby="landing-pricing-title"
            className="bg-white px-5 pt-16 pb-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:pt-20 min-[761px]:pb-24"
            id="pricing"
        >
            {/* Pricing introduction */}
            <div className="mx-auto grid max-w-300 gap-x-[5vw] min-[761px]:grid-cols-[1fr_2fr]">
                <p className="text-[13px] font-black tracking-[.15em]">{t('eyebrow')}</p>
                <div>
                    <h2
                        className="mt-5 max-w-205 font-[Baskerville,Georgia,serif] text-[clamp(48px,11vw,88px)] leading-[.9] tracking-[-.055em] min-[761px]:mt-0"
                        id="landing-pricing-title"
                    >
                        {t('heading')}
                    </h2>
                    <p className="mt-5 max-w-155 text-base leading-relaxed">{t('intro')}</p>
                </div>
            </div>

            {/* Event categories */}
            <div
                aria-label={t('categoryLabel')}
                className="mx-auto mt-16 flex max-w-331 border-b border-[#151313]/20 min-[761px]:mt-20"
                role="tablist"
            >
                {CATEGORY_ORDER.map((key) => {
                    const categoryHasPlans = categories[key].plans.length > 0;
                    return (
                        <button
                            aria-controls="landing-pricing-panel"
                            aria-selected={category === key}
                            className={cn(
                                'relative min-h-18 w-1/2 px-2 pb-4 text-center text-[12px] leading-tight font-black focus-ring transition-colors focus-visible:-outline-offset-4 min-[761px]:min-h-12 min-[761px]:px-6 min-[761px]:text-[17px]',
                                {
                                    'text-[#151313]/65 hover:text-[#151313]': category !== key && categoryHasPlans,
                                    'text-[#151313] after:absolute after:inset-x-0 after:bottom-0 after:h-0.75 after:bg-[linear-gradient(90deg,#df7794,#f2c764)]':
                                        category === key,
                                    'cursor-not-allowed text-[#151313]/30': !categoryHasPlans,
                                },
                            )}
                            data-category={key}
                            id={`landing-pricing-tab-${key}`}
                            key={key}
                            onClick={selectCategory}
                            onKeyDown={handleCategoryKeyDown}
                            role="tab"
                            tabIndex={category === key ? 0 : -1}
                            type="button"
                            disabled={!categoryHasPlans}
                        >
                            <span>{categories[key].label}</span>
                            {!categoryHasPlans && <p className="text-center text-lg text-[#151313]/60 min-[761px]:col-span-3">{t('comingSoon')}</p>}
                        </button>
                    );
                })}
            </div>

            {/* Plans */}
            <div
                aria-labelledby={`landing-pricing-tab-${category}`}
                className="mx-auto mt-9 grid max-w-331 gap-5 min-[761px]:grid-cols-3 min-[761px]:gap-[clamp(24px,3vw,52px)]"
                id="landing-pricing-panel"
                role="tabpanel"
            >
                {categories[category].plans.length &&
                    categories[category].plans.map((plan, index) => (
                        <MarketingPlanCard
                            featured={index === 1}
                            footer={<LandingPricingCta className="mt-5 flex w-full min-[761px]:hidden" label={t('cta')} />}
                            key={`${category}-${plan.code}`}
                            plan={plan}
                            durationId={picks[plan.code]}
                            onDurationChangeAction={pickDuration}
                            popularLabel={t('popular')}
                            storageLabel={t('storageLabel')}
                            durationLabel={t('durationLabel')}
                            expandLabel={t('showFeatures')}
                            collapseLabel={t('hideFeatures')}
                            defaultExpanded={index === 0}
                        />
                    ))}
            </div>

            {/* Create CTA */}
            <div className="mx-auto mt-8 flex max-w-331 flex-col items-center gap-3 min-[761px]:mt-12">
                <LandingPricingCta className="hidden min-[761px]:flex" label={t('cta')} />
                <p className="text-center text-[12px] text-[#151313]/65">{t('verifyNotice')}</p>
            </div>
        </section>
    );
}
