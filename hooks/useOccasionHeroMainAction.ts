import { useLandingSignedIn } from '@/hooks/useLandingSignedIn';
import { occasionHeroMainAction } from '@/lib/landingHero';

type OccasionHeroLabels = { create: string; plans: string };

// The occasion hero's main button. The server renders the signed-out one (the plans); it switches to
// create once it has hydrated and the session shows the visitor is signed in, like the landing hero.
export function useOccasionHeroMainAction(createHref: string, labels: OccasionHeroLabels) {
    const isSignedIn = useLandingSignedIn();

    return { main: occasionHeroMainAction(isSignedIn, createHref), label: isSignedIn ? labels.create : labels.plans };
}
