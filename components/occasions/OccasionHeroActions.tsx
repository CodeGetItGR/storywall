'use client';

import { LandingHeroActions } from '@/components/landing/LandingHeroActions';
import { useOccasionHeroMainAction } from '@/hooks/useOccasionHeroMainAction';
import type { HeroSecondaryLink } from '@/lib/landingHero';

type OccasionHeroActionsProps = {
    createHref: string;
    createLabel: string;
    plansLabel: string;
    // The demo, the themes, or null for the main button only.
    secondary: HeroSecondaryLink | null;
};

// The occasion hero's buttons: the plans (or create, once signed in) and a second link, as plain buttons.
export function OccasionHeroActions({ createHref, createLabel, plansLabel, secondary }: OccasionHeroActionsProps) {
    const { main, label } = useOccasionHeroMainAction(createHref, { create: createLabel, plans: plansLabel });

    return <LandingHeroActions plain createHref={createHref} main={main} mainLabel={label} secondary={secondary} />;
}
