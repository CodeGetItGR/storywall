import type { ComponentType } from 'react';

import { AnnouncementRender } from '@/components/vendorPages/renders/AnnouncementRender';
import { LiveRequestsRender } from '@/components/vendorPages/renders/LiveRequestsRender';
import { RsvpReportRender } from '@/components/vendorPages/renders/RsvpReportRender';
import { ScheduleRender } from '@/components/vendorPages/renders/ScheduleRender';
import { ShareLinksRender } from '@/components/vendorPages/renders/ShareLinksRender';
import { IncludedRender, PrintsRender, ProAlbumRender, SneakPeekRender } from '@/components/vendorPages/renders/toolRendersPhoto';
import type { VendorPageType } from '@/i18n/publicLocale';
import type { VendorTool } from '@/lib/vendorPages';

// The render in each tool's frame.
export const TOOL_RENDERS: Record<VendorTool, ComponentType<{ type: VendorPageType }>> = {
    proAlbum: ProAlbumRender,
    sneakPeek: SneakPeekRender,
    prints: PrintsRender,
    included: IncludedRender,
    schedule: ScheduleRender,
    announce: AnnouncementRender,
    rsvpReport: RsvpReportRender,
    shareLinks: ShareLinksRender,
    liveRequests: LiveRequestsRender,
};
