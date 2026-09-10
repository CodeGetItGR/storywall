'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCard } from '@/components/landing/LandingPricingCard';

type LandingPlan = { description: string; features: string[]; name: string; price: string };

export function LandingPricing() {
    const t = useTranslations('LandingPage.pricing');
    const plans = t.raw('plans') as LandingPlan[];

    return (
        <section className="swpricing swpricing-editorial" id="pricing">
            <div className="swpricing-head">
                <div className="swpricing-kicker">{t('eyebrow')}</div>
                <div className="swpricing-titlewrap">
                    <h2>{t('heading')}</h2>
                    <p>{t('intro')}</p>
                </div>
            </div>
            <div className="swpricing-editorial-grid">
                {plans.map((plan, index) => (
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
            <div className="swpricing-note">{t('note')}</div>
        </section>
    );
}
