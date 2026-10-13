import { describe, expect, it } from 'vitest';

import { occasionCreateHref } from '@/lib/occasions/occasionLinks';
import { OCCASIONS } from '@/lib/occasions/occasions';

const wedding = OCCASIONS[0];

describe('occasionCreateHref', () => {
    it('links to the wizard on the type, with a campaign code when there is one', () => {
        expect(occasionCreateHref(wedding, null)).toBe('/events/new?type=wedding');
        expect(occasionCreateHref(wedding, { id: 'x', occasions: 'all', startsAt: '', endsAt: '', discountCode: 'C1' })).toBe(
            '/events/new?type=wedding&code=C1',
        );
    });
});
