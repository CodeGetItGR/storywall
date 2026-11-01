import {
    BadgeCheck,
    BookHeart,
    CalendarCheck,
    CalendarClock,
    Camera,
    ChartNoAxesColumn,
    ClipboardCheck,
    ClipboardList,
    Download,
    Eye,
    Flower2,
    Gift,
    Images,
    Landmark,
    LayoutDashboard,
    ListChecks,
    type LucideIcon,
    Mail,
    MapPin,
    Megaphone,
    MessageCircle,
    MessageSquareText,
    Music,
    PackageCheck,
    Palette,
    Printer,
    QrCode,
    Sparkles,
    Store,
    Tag,
    TicketPercent,
    Upload,
    Users,
    UtensilsCrossed,
    Video,
    Wallet,
} from 'lucide-react';

import type { VendorPageType } from '@/i18n/publicLocale';
import type { VENDOR_ALWAYS, VENDOR_CLIENT_PHASES, VendorPartnerPerk, VendorTool } from '@/lib/vendorPages';

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

export const PARTNER_ICONS: Record<VendorPartnerPerk, LucideIcon> = {
    discount: TicketPercent,
    feedCard: BadgeCheck,
    fullReach: ChartNoAxesColumn,
    printPrices: Tag,
    portal: Wallet,
};

type Phase = (typeof VENDOR_CLIENT_PHASES)[number];

// One icon per row of VendorPages.clients.{host,guest}.<phase>, in the same order.
export const CLIENT_ICONS: Record<'host' | 'guest', Record<Phase, LucideIcon[]>> = {
    host: {
        before: [LayoutDashboard, Mail, QrCode, Users, Palette],
        during: [Megaphone, ListChecks],
        after: [Download, BookHeart, Printer],
    },
    guest: {
        before: [QrCode, CalendarCheck, MapPin, Gift],
        during: [MessageCircle, Upload, Music, Store],
        after: [Images, BookHeart, Download],
    },
};
