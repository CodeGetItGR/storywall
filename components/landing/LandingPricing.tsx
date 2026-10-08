'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
import { LandingPricingEventSelect } from '@/components/landing/LandingPricingEventSelect';
import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import { useLandingPricing } from '@/hooks/useLandingPricing';
import { cn } from '@/lib/utils';

// Columns by card count from 761px up: fewer cards get a narrower, centered grid instead of an empty column.
const PLAN_GRID: Record<number, string> = {
    1: 'max-w-110',
    2: 'max-w-221 min-[761px]:grid-cols-2',
    3: 'max-w-331 min-[761px]:grid-cols-3',
};

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const { groups, active, pickEventType, picks, pickDuration } = useLandingPricing();

    if (!active) return null;

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

            {/* Event type */}
            <div className="mx-auto mt-16 flex max-w-331 flex-col items-center min-[761px]:mt-20">
                <LandingPricingEventSelect
                    emptyLabel={t('eventTypeEmpty')}
                    groups={groups}
                    label={t('eventTypeLabel')}
                    onValueChangeAction={pickEventType}
                    searchPlaceholder={t('eventTypeSearch')}
                    value={active}
                />
            </div>

            {/* Plans */}
            <div className={cn('mx-auto mt-9 grid gap-5 min-[761px]:gap-[clamp(24px,3vw,52px)]', PLAN_GRID[Math.min(active.plans.length, 3)])}>
                {active.plans.map((plan, index) => (
                    <MarketingPlanCard
                        featured={index === 1}
                        footer={<LandingPricingCta className="mt-5 flex w-full min-[761px]:hidden" eventType={active.id} label={t('cta')} />}
                        key={`${active.id}-${plan.code}`}
                        plan={plan}
                        durationId={picks[plan.code]}
                        onDurationChangeAction={pickDuration}
                        popularLabel={t('popular')}
                        durationLabel={t('durationLabel')}
                        listPriceLabel={t('listPrice')}
                        expandLabel={t('showFeatures')}
                        collapseLabel={t('hideFeatures')}
                        defaultExpanded={index === 0}
                    />
                ))}
            </div>

            {/* Create CTA */}
            <div className="mx-auto mt-8 flex max-w-331 flex-col items-center gap-3 min-[761px]:mt-12">
                <LandingPricingCta className="hidden min-[761px]:flex" eventType={active.id} label={t('cta')} />
                <p className="text-center text-[12px] text-[#151313]/65">{t('verifyNotice')}</p>
            </div>
        </section>
    );
}
