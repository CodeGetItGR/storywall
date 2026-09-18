'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCard } from '@/components/landing/LandingPricingCard';
import { useLandingPricingCategory } from '@/hooks/useLandingPricingCategory';
import type { LandingPlan } from '@/lib/landingPricing';
import { cn } from '@/lib/utils';

type PricingCategories = Record<'vip' | 'wedding', { label: string; plans: LandingPlan[] }>;
const CATEGORY_ORDER = ['wedding', 'vip'] as const;

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const categories = t.raw('categories') as PricingCategories;
    const { category, selectCategory, handleCategoryKeyDown } = useLandingPricingCategory();

    return (
        <section
            aria-labelledby="landing-pricing-title"
            className="bg-white px-5 pt-16 pb-16 text-[#151313] min-[761px]:px-[clamp(24px,4vw,72px)] min-[761px]:pt-20 min-[761px]:pb-24"
            id="pricing"
        >
            {/* Pricing introduction */}
            <div className="mx-auto grid max-w-[1200px] gap-x-[5vw] min-[761px]:grid-cols-[1fr_2fr]">
                <p className="text-[13px] font-black tracking-[.15em]">{t('eyebrow')}</p>
                <div>
                    <h2
                        className="mt-5 max-w-[820px] [font-family:Baskerville,Georgia,serif] text-[clamp(48px,11vw,88px)] leading-[.9] tracking-[-.055em] min-[761px]:mt-0"
                        id="landing-pricing-title"
                    >
                        {t('heading')}
                    </h2>
                    <p className="mt-5 max-w-[620px] text-base leading-relaxed">{t('intro')}</p>
                </div>
            </div>

            {/* Event categories */}
            <div
                aria-label={t('categoryLabel')}
                className="mx-auto mt-16 flex max-w-[1324px] border-b border-[#151313]/20 min-[761px]:mt-20"
                role="tablist"
            >
                {CATEGORY_ORDER.map((key) => (
                    <button
                        aria-controls="landing-pricing-panel"
                        aria-selected={category === key}
                        className={cn(
                            'relative min-h-[72px] w-1/2 px-2 pb-4 text-center text-[12px] leading-tight font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#df7794] min-[761px]:min-h-12 min-[761px]:px-6 min-[761px]:text-[17px]',
                            category === key
                                ? 'text-[#151313] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[linear-gradient(90deg,#df7794,#f2c764)]'
                                : 'text-[#151313]/50 hover:text-[#151313]'
                        )}
                        data-category={key}
                        id={`landing-pricing-tab-${key}`}
                        key={key}
                        onClick={selectCategory}
                        onKeyDown={handleCategoryKeyDown}
                        role="tab"
                        tabIndex={category === key ? 0 : -1}
                        type="button"
                    >
                        {categories[key].label}
                    </button>
                ))}
            </div>

            {/* Plans */}
            <div
                aria-labelledby={`landing-pricing-tab-${category}`}
                className="mx-auto mt-9 grid max-w-[1324px] gap-5 min-[761px]:grid-cols-3 min-[761px]:gap-[clamp(24px,3vw,52px)]"
                id="landing-pricing-panel"
                role="tabpanel"
            >
                {categories[category].plans.map((plan, index) => (
                    <LandingPricingCard
                        chooseLabel={t('choose')}
                        featured={index === 1}
                        key={`${category}-${plan.name}`}
                        photosLabel={t('photosLabel')}
                        plan={plan}
                        popularLabel={t('popular')}
                        storageLabel={t('storageLabel')}
                        storageNote={t('storageNote')}
                        videosLabel={t('videosLabel')}
                    />
                ))}
            </div>
            <p className="mx-auto mt-5 max-w-[1324px] text-right text-[11px]">{t('note')}</p>
        </section>
    );
}
