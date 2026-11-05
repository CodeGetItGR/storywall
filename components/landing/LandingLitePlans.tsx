'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
import { LitePlansSection } from '@/components/plan/LitePlansSection';
import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import type { LandingPricingEventType } from '@/hooks/useLandingPricingPlans';
import { cn } from '@/lib/utils';

// A narrower grid than the full plans', so the lite cards come out smaller.
const LITE_WIDTH: Record<number, string> = { 1: 'max-w-80', 2: 'max-w-160', 3: 'max-w-250' };
const LITE_COLUMNS: Record<number, string> = { 1: '', 2: 'min-[761px]:grid-cols-2', 3: 'min-[761px]:grid-cols-3' };

type LandingLitePlansProps = {
    eventType: LandingPricingEventType;
    picks: Record<string, string>;
    onPickDurationAction: (planCode: string, optionId: string) => void;
    className?: string;
};

// The event type's lite plans in their own titled section. Nothing without lite plans.
export function LandingLitePlans({ eventType, picks, onPickDurationAction, className }: LandingLitePlansProps) {
    const t = useTranslations('LandingPage.pricing');
    const { litePlans } = eventType;
    if (litePlans.length === 0) return null;
    const count = Math.min(litePlans.length, 3);

    return (
        <LitePlansSection className={className} heading={t('liteHeading')} intro={t('liteIntro')}>
            {/* Lite plan cards */}
            <div className={cn('mx-auto grid gap-5 min-[761px]:gap-6', LITE_WIDTH[count], LITE_COLUMNS[count])}>
                {litePlans.map((plan) => (
                    <MarketingPlanCard
                        collapseLabel={t('hideFeatures')}
                        durationId={picks[plan.code]}
                        durationLabel={t('durationLabel')}
                        expandLabel={t('showFeatures')}
                        featured={false}
                        footer={
                            <LandingPricingCta
                                className="mt-5 flex w-full"
                                durationId={picks[plan.code]}
                                eventType={eventType.id}
                                label={t('choose')}
                                plan={plan}
                            />
                        }
                        key={`${eventType.id}-${plan.code}`}
                        listPriceLabel={t('listPrice')}
                        onDurationChangeAction={onPickDurationAction}
                        plan={plan}
                        popularLabel={t('popular')}
                    />
                ))}
            </div>
        </LitePlansSection>
    );
}
