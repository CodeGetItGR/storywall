import { Link2, Mail } from 'lucide-react';
import { FaInstagram } from 'react-icons/fa6';
import { describe, expect, it } from 'vitest';

import { CAMPAIGN_LINK_TYPE_ICONS, CAMPAIGN_PLATFORM_COLORS, CAMPAIGN_PLATFORM_ICONS } from '@/lib/campaignIcons';
import { CAMPAIGN_PLATFORMS } from '@/lib/campaignLinks';

describe('campaign icons', () => {
    it('has an icon and a color for every platform', () => {
        for (const platform of CAMPAIGN_PLATFORMS) {
            expect(CAMPAIGN_PLATFORM_ICONS[platform]).toBeDefined();
            expect(CAMPAIGN_PLATFORM_COLORS[platform]).toMatch(/^text-/);
        }
    });

    it('draws a brand with its logo and anything else with what it is', () => {
        expect(CAMPAIGN_PLATFORM_ICONS.instagram).toBe(FaInstagram);
        expect(CAMPAIGN_PLATFORM_ICONS.email).toBe(Mail);
        expect(CAMPAIGN_PLATFORM_ICONS.other).toBe(Link2);
    });

    it('draws a story apart from a post, and an ad like its kind', () => {
        expect(CAMPAIGN_LINK_TYPE_ICONS.story).not.toBe(CAMPAIGN_LINK_TYPE_ICONS.post);
        expect(CAMPAIGN_LINK_TYPE_ICONS.storyAd).toBe(CAMPAIGN_LINK_TYPE_ICONS.story);
        expect(CAMPAIGN_LINK_TYPE_ICONS.postAd).toBe(CAMPAIGN_LINK_TYPE_ICONS.post);
    });
});
