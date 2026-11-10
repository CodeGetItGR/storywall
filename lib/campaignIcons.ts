import { Handshake, Link2, type LucideIcon, Mail, Megaphone, QrCode, RectangleVertical, Search, Share2, Square } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaFacebookF, FaGoogle, FaInstagram, FaLinkedinIn, FaPinterestP, FaTiktok, FaYoutube } from 'react-icons/fa6';

import type { CampaignLinkType, CampaignPlatform, CampaignPresetGroup } from '@/lib/campaignLinks';

export type CampaignIcon = IconType | LucideIcon;

// A brand's logo, or what the link is for the rest.
export const CAMPAIGN_PLATFORM_ICONS: Readonly<Record<CampaignPlatform, CampaignIcon>> = {
    instagram: FaInstagram,
    facebook: FaFacebookF,
    tiktok: FaTiktok,
    google: FaGoogle,
    pinterest: FaPinterestP,
    youtube: FaYoutube,
    linkedin: FaLinkedinIn,
    email: Mail,
    partner: Handshake,
    qr: QrCode,
    other: Link2,
};

// Each brand in its own color. TikTok's logo is black, so it takes the ink and stays readable in
// dark mode. Links that aren't a brand stay muted.
export const CAMPAIGN_PLATFORM_COLORS: Readonly<Record<CampaignPlatform, string>> = {
    instagram: 'text-[#E4405F]',
    facebook: 'text-[#1877F2]',
    tiktok: 'text-ink',
    google: 'text-[#4285F4]',
    pinterest: 'text-[#E60023]',
    youtube: 'text-[#FF0000]',
    linkedin: 'text-[#0A66C2]',
    email: 'text-ink-muted',
    partner: 'text-ink-muted',
    qr: 'text-ink-muted',
    other: 'text-ink-muted',
};

// A post is square and a story tall; CampaignLinkTypeIcon adds a megaphone to an ad.
export const CAMPAIGN_LINK_TYPE_ICONS: Readonly<Record<CampaignLinkType, CampaignIcon>> = {
    post: Square,
    story: RectangleVertical,
    postAd: Square,
    storyAd: RectangleVertical,
    searchAd: Search,
};

// The old link table's section labels. Removed with that table in KAN-192.
export const CAMPAIGN_SECTION_ICONS: Readonly<Record<CampaignPresetGroup, CampaignIcon>> = {
    social: Share2,
    ads: Megaphone,
    other: Link2,
};
