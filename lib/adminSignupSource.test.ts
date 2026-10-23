import { describe, expect, it } from 'vitest';

import { signupSourceDetail } from '@/lib/adminSignupSource';
import type { SignupSourceDto } from '@/lib/api/types';

const base: SignupSourceDto = {
    channel: 'SOCIAL',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    adClick: null,
    referrerHost: null,
    landingPage: null,
};

describe('signupSourceDetail', () => {
    it('joins the campaign source and name', () => {
        expect(signupSourceDetail({ ...base, utmSource: 'instagram', utmCampaign: 'bio-link' })).toBe('instagram / bio-link');
    });

    it('falls back to the referring site', () => {
        expect(signupSourceDetail({ ...base, referrerHost: 'l.instagram.com' })).toBe('l.instagram.com');
    });

    it('is null when there is nothing beyond the channel', () => {
        expect(signupSourceDetail(base)).toBeNull();
    });
});
