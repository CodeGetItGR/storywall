import { Link2, Mail, QrCode } from 'lucide-react';
import { FaGoogle, FaInstagram, FaTiktok } from 'react-icons/fa6';
import { describe, expect, it } from 'vitest';

import { campaignPlatformIcon } from '@/lib/campaignIcons';

describe('campaignPlatformIcon', () => {
    it('uses the platform, whether the link is organic or paid', () => {
        expect(campaignPlatformIcon('instagram', 'social')).toBe(FaInstagram);
        expect(campaignPlatformIcon('instagram', 'paid_social')).toBe(FaInstagram);
        expect(campaignPlatformIcon('tiktok', 'social')).toBe(FaTiktok);
        expect(campaignPlatformIcon('google', 'cpc')).toBe(FaGoogle);
    });

    it('ignores case', () => {
        expect(campaignPlatformIcon('Instagram', 'social')).toBe(FaInstagram);
    });

    it('falls back to the kind of link', () => {
        expect(campaignPlatformIcon('newsletter', 'email')).toBe(Mail);
        expect(campaignPlatformIcon('print', 'qr')).toBe(QrCode);
    });

    it('has an icon for anything else', () => {
        expect(campaignPlatformIcon('somewhere', 'other')).toBe(Link2);
        expect(campaignPlatformIcon(null, null)).toBe(Link2);
    });
});
