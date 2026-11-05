import { Handshake, Link2, type LucideIcon, Mail, Megaphone, QrCode, Share2 } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaFacebookF, FaGoogle, FaInstagram, FaLinkedinIn, FaPinterestP, FaTiktok, FaYoutube } from 'react-icons/fa6';

import type { CampaignPresetGroup } from '@/lib/campaignLinks';

export type CampaignIcon = IconType | LucideIcon;

const SOURCE_ICONS: Readonly<Record<string, CampaignIcon>> = {
    instagram: FaInstagram,
    facebook: FaFacebookF,
    tiktok: FaTiktok,
    pinterest: FaPinterestP,
    linkedin: FaLinkedinIn,
    youtube: FaYoutube,
    google: FaGoogle,
};

const MEDIUM_ICONS: Readonly<Record<string, CampaignIcon>> = {
    email: Mail,
    qr: QrCode,
    partner: Handshake,
};

export const CAMPAIGN_SECTION_ICONS: Readonly<Record<CampaignPresetGroup, CampaignIcon>> = {
    social: Share2,
    ads: Megaphone,
    other: Link2,
};

// The platform's logo, or else what kind of link it is. Values typed by hand may not be lowercase.
export function campaignPlatformIcon(source: string | null, medium: string | null): CampaignIcon {
    return SOURCE_ICONS[source?.toLowerCase() ?? ''] ?? MEDIUM_ICONS[medium?.toLowerCase() ?? ''] ?? Link2;
}
