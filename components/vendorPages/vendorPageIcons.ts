import {
    CalendarClock,
    Camera,
    ClipboardCheck,
    ClipboardList,
    Eye,
    Flower2,
    Images,
    Landmark,
    LayoutDashboard,
    type LucideIcon,
    Megaphone,
    MessageSquareText,
    Music,
    PackageCheck,
    Printer,
    QrCode,
    Sparkles,
    Store,
    UtensilsCrossed,
    Video,
} from 'lucide-react';

import type { VendorPageType } from '@/i18n/publicLocale';
import type { VENDOR_ALWAYS, VendorTool } from '@/lib/vendorPages';

export const TYPE_ICONS: Record<VendorPageType, LucideIcon> = {
    PLANNER: ClipboardList,
    VENUE: Landmark,
    PHOTOGRAPHER: Camera,
    VIDEOGRAPHER: Video,
    DECORATION: Flower2,
    CATERING: UtensilsCrossed,
    MUSIC: Music,
};

export const TOOL_ICONS: Record<VendorTool, LucideIcon> = {
    proAlbum: Images,
    sneakPeek: Sparkles,
    prints: Printer,
    included: PackageCheck,
    schedule: CalendarClock,
    announce: Megaphone,
    rsvpReport: ClipboardCheck,
    shareLinks: QrCode,
    liveRequests: Music,
};

export const ALWAYS_ICONS: Record<(typeof VENDOR_ALWAYS)[number], LucideIcon> = {
    listing: Store,
    posts: MessageSquareText,
    reach: Eye,
    myPage: LayoutDashboard,
};
