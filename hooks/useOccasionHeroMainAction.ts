import { useAuth } from '@/hooks/useAuth';
import { occasionHeroMainAction } from '@/lib/landingHero';

type OccasionHeroLabels = { create: string; plans: string };

// The occasion hero's main button. The server renders the signed-out one (the plans); it switches to
// create once the session shows the visitor is signed in, like the landing hero.
export function useOccasionHeroMainAction(createHref: string, labels: OccasionHeroLabels) {
    const { isAuthenticated, isBootstrapping } = useAuth();
    const isSignedIn = isAuthenticated && !isBootstrapping;

    return { main: occasionHeroMainAction(isSignedIn, createHref), label: isSignedIn ? labels.create : labels.plans };
}
