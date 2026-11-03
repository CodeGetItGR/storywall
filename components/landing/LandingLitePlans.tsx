'use client';

import { useTranslations } from 'next-intl';

import { LandingPricingCta } from '@/components/landing/LandingPricingCta';
import { LitePlansTeaser } from '@/components/plan/LitePlansTeaser';
import { MarketingPlanCard } from '@/components/plan/MarketingPlanCard';
import { useDisclosure } from '@/hooks/useDisclosure';
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

// The teaser line and, once opened, the event type's lite plans. Nothing without lite plans. Key it by
// event type so it starts closed again after a switch.
export function LandingLitePlans({ eventType, picks, onPickDurationAction, className }: LandingLitePlansProps) {
    const t = useTranslations('LandingPage.pricing');
    const { open, toggle } = useDisclosure();
    const { litePlans, liteFromPrice } = eventType;
    if (litePlans.length === 0 || liteFromPrice === null) return null;
    const count = Math.min(litePlans.length, 3);

    return (
        <LitePlansTeaser className={className} label={t('liteTeaser', { price: liteFromPrice })} onToggleAction={toggle} open={open}>
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
        </LitePlansTeaser>
    );
}
