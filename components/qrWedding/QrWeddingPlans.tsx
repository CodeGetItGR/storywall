'use client';

import { QrWeddingPlanCard } from '@/components/qrWedding/QrWeddingPlanCard';
import { useLandingPricing } from '@/hooks/useLandingPricing';
import { eventTypeSlug } from '@/lib/eventTypeSlug';

const WEDDING = eventTypeSlug('WEDDING');

// The live wedding packages, the middle one featured. Nothing until the packages load.
// durationGroup names each card's duration switch, with {plan} standing for the package's name.
export function QrWeddingPlans({ chooseLabel, durationGroup }: { chooseLabel: string; durationGroup: string }) {
    const { active, picks, pickDuration } = useLandingPricing(WEDDING);

    if (!active) return null;

    return (
        <div className="mx-auto mt-12 grid grid-cols-3 gap-[clamp(24px,3vw,48px)] max-[1051px]:gap-4 max-[901px]:max-w-140 max-[901px]:grid-cols-1 max-[901px]:gap-5.5 max-[781px]:mt-8 max-[601px]:max-w-120">
            {active.plans.map((plan, index) => (
                <QrWeddingPlanCard
                    chooseLabel={chooseLabel}
                    durationGroupLabel={durationGroup.replace('{plan}', plan.name)}
                    durationId={picks[plan.code]}
                    eventType={active.id}
                    featured={index === 1}
                    key={plan.code}
                    onDurationChangeAction={pickDuration}
                    plan={plan}
                />
            ))}
        </div>
    );
}
