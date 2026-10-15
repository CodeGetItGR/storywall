import { describe, expect, it } from 'vitest';

import { LANDING_PRICING_HASH, landingHeroMainAction } from '@/lib/landingHero';
import { routes } from '@/lib/routes';

describe('landingHeroMainAction', () => {
    it('sends signed-out visitors to the plans on the page', () => {
        expect(landingHeroMainAction(false)).toEqual({
            href: LANDING_PRICING_HASH,
            arrow: '↓',
            click: { event: 'plans', placement: 'hero' },
        });
    });

    it('sends signed-in visitors to their account', () => {
        expect(landingHeroMainAction(true)).toEqual({
            href: routes.home,
            arrow: '↗',
            click: { event: 'create', placement: 'hero' },
        });
    });
});
