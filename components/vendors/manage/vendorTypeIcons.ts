import { Camera, Castle, ClipboardList, Flower2, type LucideIcon, Music, Store, UtensilsCrossed, Video } from 'lucide-react';

import type { PartnerRole } from '@/lib/api/types';

// One icon per vendor type, shared by the Vendors picture markers and the "What vendors can do" rows.
export const VENDOR_TYPE_ICONS: Record<PartnerRole, LucideIcon> = {
    PHOTOGRAPHER: Camera,
    VIDEOGRAPHER: Video,
    VENUE: Castle,
    DECORATION: Flower2,
    PLANNER: ClipboardList,
    CATERING: UtensilsCrossed,
    MUSIC: Music,
    OTHER: Store,
};
