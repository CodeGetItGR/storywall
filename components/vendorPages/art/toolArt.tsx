import { Camera, PackageCheck, Printer, Sparkles } from 'lucide-react';

import type { VendorArt } from '@/components/vendorPages/art/VendorPageArt';
import { AnnouncementArt, LiveRequestsArt, PAPER, QrArt, RsvpReportArt, ScheduleArt } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';
import type { VendorTool } from '@/lib/vendorPages';

// Colour blocks standing in for photos.
const PHOTOS = ['bg-status-teal/45', 'bg-accent-pink/40', 'bg-status-warn/55', 'bg-status-info/45'];

// A grid of photos with the camera that took them.
function ProAlbumArt() {
    return (
        <>
            <div className={cn(PAPER, 'grid w-12 -rotate-3 grid-cols-2 gap-0.5 p-1')}>
                {PHOTOS.map((photo) => (
                    <span key={photo} className={cn('aspect-square rounded-[3px]', photo)} />
                ))}
            </div>
            <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-status-teal text-white shadow-sm">
                <Camera className="size-3.5" />
            </span>
        </>
    );
}

// A fan of photos going out to the guests.
function SneakPeekArt() {
    return (
        <>
            {['-rotate-12 -translate-x-3', 'z-10', 'rotate-12 translate-x-3'].map((place, i) => (
                <div key={place} className={cn(PAPER, 'absolute h-10 w-8 p-0.5', place)}>
                    <span className={cn('block h-7 rounded-[3px]', PHOTOS[i])} />
                </div>
            ))}
            <span className="absolute top-2 right-2 z-20 flex size-5 items-center justify-center rounded-full bg-status-warn text-white shadow-sm">
                <Sparkles className="size-3" />
            </span>
        </>
    );
}

// Two prints coming out of the printer.
function PrintsArt() {
    return (
        <>
            <div className={cn(PAPER, 'absolute top-3 left-4 h-9 w-11 rotate-6 p-1')}>
                <span className="block h-full rounded-[3px] bg-status-info/30" />
            </div>
            <div className={cn(PAPER, 'relative h-9 w-11 -rotate-3 p-1')}>
                <span className="block h-full rounded-[3px] bg-accent-pink/35" />
            </div>
            <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-status-info text-white shadow-sm">
                <Printer className="size-3.5" />
            </span>
        </>
    );
}

// The prints in a plan, some used.
function IncludedArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex w-13 rotate-2 flex-col gap-1.5 p-1.5')}>
                <div className="flex gap-1">
                    {[true, true, false].map((used, i) => (
                        <span key={i} className={cn('h-4 flex-1 rounded-[3px]', used ? 'bg-status-good/50' : 'bg-ink/10')} />
                    ))}
                </div>
                <span className="h-1 w-8 rounded-full bg-ink/15" />
            </div>
            <span className="absolute bottom-2 left-2.5 flex size-5 items-center justify-center rounded-full bg-status-good text-white shadow-sm">
                <PackageCheck className="size-3" />
            </span>
        </>
    );
}

// The in-event tools reuse the drawings from the vendor's own page in the event.
export const TOOL_ART: Record<VendorTool, VendorArt> = {
    proAlbum: { Art: ProAlbumArt, wash: 'bg-status-teal-wash' },
    sneakPeek: { Art: SneakPeekArt, wash: 'bg-status-warn-wash' },
    prints: { Art: PrintsArt, wash: 'bg-status-info-wash' },
    included: { Art: IncludedArt, wash: 'bg-status-good-wash' },
    schedule: { Art: ScheduleArt, wash: 'bg-status-info-wash' },
    announce: { Art: AnnouncementArt, wash: 'bg-status-warn-wash' },
    rsvpReport: { Art: RsvpReportArt, wash: 'bg-status-good-wash' },
    shareLinks: { Art: QrArt, wash: 'bg-status-violet-wash' },
    liveRequests: { Art: LiveRequestsArt, wash: 'bg-status-teal-wash' },
};
