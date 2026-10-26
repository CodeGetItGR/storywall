'use client';

import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { useOccasionHeroMainAction } from '@/hooks/useOccasionHeroMainAction';

type OccasionHeroActionsProps = {
    createHref: string;
    createLabel: string;
    // null: no demo for this type, so the hero shows the main button only.
    demoHref: string | null;
    demoLabel: string;
    plansLabel: string;
};

// The occasion hero's buttons: the plans (or create, once signed in) and the demo, without arrows.
export function OccasionHeroActions({ createHref, createLabel, demoHref, demoLabel, plansLabel }: OccasionHeroActionsProps) {
    const { main, label } = useOccasionHeroMainAction(createHref, { create: createLabel, plans: plansLabel });

    return (
        <LandingHeroActions
            arrows={false}
            demoHref={demoHref ?? undefined}
            demoLabel={demoHref ? demoLabel : undefined}
            main={main}
            mainLabel={label}
        />
    );
}
