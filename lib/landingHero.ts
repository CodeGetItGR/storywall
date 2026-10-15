import type { LandingClick } from '@/lib/landingTracking';
import { routes } from '@/lib/routes';

export type LandingHeroMainAction = {
    href: string;
    // Down for a jump to the plans on this page, up-right for leaving it.
    arrow: '↓' | '↗';
    click: LandingClick;
};

export const LANDING_PRICING_HASH = '#pricing';

// Signed-out visitors see the plans and their prices before anything asks them to log in. Signed-in
// visitors go straight to their account, as before.
export function landingHeroMainAction(isSignedIn: boolean): LandingHeroMainAction {
    return isSignedIn
        ? { href: routes.home, arrow: '↗', click: { event: 'create', placement: 'hero' } }
        : { href: LANDING_PRICING_HASH, arrow: '↓', click: { event: 'plans', placement: 'hero' } };
}
