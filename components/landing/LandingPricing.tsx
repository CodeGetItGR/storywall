'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCard } from '@/components/landing/LandingPricingCard';
import { useLandingPricingCategory } from '@/hooks/useLandingPricingCategory';

type LandingPlan = { description: string; features: string[]; name: string; price: string };
type PricingCategories = Record<'vip' | 'wedding', { label: string; plans: LandingPlan[] }>;

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const categories = t.raw('categories') as PricingCategories;
    const { category, setCategory } = useLandingPricingCategory();
    const activeCategory = categories[category];

    return (
        /* Pricing */
        <section
            className="bg-white px-5 pt-16 pb-[72px] [font-family:Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[7vw] min-[761px]:pt-[100px] min-[761px]:pb-[110px]"
            id="pricing"
        >
            <div className="mx-auto mb-[58px] block w-full max-w-[1280px] min-[761px]:grid min-[761px]:grid-cols-[1fr_2.1fr] min-[761px]:items-start min-[761px]:gap-[72px]">
                <div className="pt-3 text-[13px] leading-[1.5] font-black tracking-[0.15em] min-[761px]:col-start-2 min-[761px]:row-start-1 min-[761px]:mb-[22px] min-[761px]:pt-0">
                    {t('eyebrow')}
                </div>
                <div className="min-[761px]:col-start-2 min-[761px]:row-start-2">
                    <h2 className="mt-6 [font-family:var(--editorial)] text-[12vw] leading-[0.9] font-normal tracking-[-0.055em] min-[761px]:mt-0 min-[761px]:text-[4.275vw]">
                        {t('heading')}
                    </h2>
                    <p className="mt-[18px] max-w-[620px] text-sm leading-[1.55] min-[761px]:mt-[25px] min-[761px]:text-base">{t('intro')}</p>
                </div>
            </div>
            <div className="mx-auto block w-full max-w-[1280px] min-[761px]:grid min-[761px]:grid-cols-3 min-[761px]:gap-[52px]">
                <div aria-label={t('categoryLabel')} className="col-span-3 mb-10 flex gap-5 overflow-x-auto border-b border-ink/20" role="tablist">
                    {(Object.keys(categories) as Array<keyof PricingCategories>).map((key) => (
                        <button aria-selected={category === key} className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-extrabold tracking-[0.1em] transition-colors ${category === key ? 'border-ink text-ink' : 'border-transparent text-ink/50 hover:text-ink'}`} key={key} onClick={() => setCategory(key)} role="tab" type="button">
                            {categories[key].label}
                        </button>
                    ))}
                </div>
                {activeCategory.plans.map((plan, index) => (
                    <LandingPricingCard
                        chooseLabel={t('choose')}
                        description={plan.description}
                        featured={index === 1}
                        features={plan.features}
                        key={plan.name}
                        name={plan.name}
                        popularLabel={t('popular')}
                        price={plan.price}
                    />
                ))}
            </div>
            <div className="mx-auto mt-7 w-full max-w-[1280px] text-[11px] leading-[1.5]">{t('note')}</div>
        </section>
    );
}
