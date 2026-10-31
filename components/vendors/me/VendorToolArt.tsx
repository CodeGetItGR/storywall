import { Check, Clock, Heart, Megaphone, Music2, Pencil, QrCode } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/lib/utils';
import type { VendorToolKey } from '@/lib/vendors';

// A small drawing of each vendor tool, built from shapes like the sneak peek's empty fan. Decoration only: the tool's
// title and description next to it say what it is.
export function VendorToolArt({ tool }: { tool: VendorToolKey }) {
    const Art = ART[tool];

    return (
        <div aria-hidden="true" className={cn('relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl', WASH[tool])}>
            <Art />
        </div>
    );
}

const WASH: Record<VendorToolKey, string> = {
    schedule: 'bg-status-info-wash',
    announcement: 'bg-status-warn-wash',
    rsvpReport: 'bg-status-good-wash',
    qr: 'bg-status-violet-wash',
    liveRequests: 'bg-status-teal-wash',
};

// A paper card the drawings sit on.
const PAPER = 'rounded-md bg-card shadow-sm ring-1 ring-ink/5';

// Three time slots on a sheet, one being edited.
function ScheduleArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex w-12 -rotate-3 flex-col gap-1.5 p-1.5')}>
                {['w-6', 'w-7', 'w-5'].map((width, i) => (
                    <div key={width} className="flex items-center gap-1">
                        <span className={cn('size-1.5 shrink-0 rounded-full', i === 1 ? 'bg-status-info' : 'bg-ink/20')} />
                        <span className={cn('h-1 rounded-full', i === 1 ? 'bg-status-info/60' : 'bg-ink/15', width)} />
                    </div>
                ))}
            </div>
            <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-card shadow-sm">
                <Clock className="size-3 text-status-info" />
            </span>
            <span className="absolute bottom-2 left-2.5 flex size-5 items-center justify-center rounded-full bg-status-info text-white shadow-sm">
                <Pencil className="size-2.5" />
            </span>
        </>
    );
}

// A megaphone with a message going out.
function AnnouncementArt() {
    return (
        <>
            <div className={cn(PAPER, 'absolute top-3 right-2 flex w-9 rotate-6 flex-col gap-1 rounded-lg rounded-bl-none p-1.5')}>
                <span className="h-1 w-6 rounded-full bg-status-warn/60" />
                <span className="h-1 w-4 rounded-full bg-ink/15" />
            </div>
            <span className="absolute bottom-2.5 left-2.5 flex size-8 items-center justify-center rounded-full bg-status-warn text-white shadow-sm">
                <Megaphone className="size-4" />
            </span>
        </>
    );
}

// A guest list with replies ticked.
function RsvpReportArt() {
    return (
        <div className={cn(PAPER, 'flex w-13 rotate-2 flex-col gap-1.5 p-1.5')}>
            {[true, true, false].map((yes, i) => (
                <div key={i} className="flex items-center gap-1">
                    <span className="size-2.5 shrink-0 rounded-full bg-ink/15" />
                    <span className="h-1 flex-1 rounded-full bg-ink/15" />
                    <span
                        className={cn(
                            'flex size-2.5 shrink-0 items-center justify-center rounded-full',
                            yes ? 'bg-status-good text-white' : 'bg-ink/10',
                        )}
                    >
                        {yes && <Check className="size-2" strokeWidth={4} />}
                    </span>
                </div>
            ))}
        </div>
    );
}

// A printed QR card standing on a table.
function QrArt() {
    return (
        <>
            <div className={cn(PAPER, 'absolute top-3 left-3.5 h-11 w-9 -rotate-8 bg-card/70')} />
            <div className={cn(PAPER, 'relative flex w-10 rotate-3 flex-col items-center gap-1 px-1 pt-1.5 pb-1')}>
                <QrCode className="size-6 text-status-violet" strokeWidth={2.25} />
                <span className="h-1 w-6 rounded-full bg-ink/15" />
            </div>
        </>
    );
}

// Song requests stacking up, one with likes.
function LiveRequestsArt() {
    return (
        <div className="flex w-13 flex-col gap-1">
            {[true, false].map((liked, i) => (
                <div key={i} className={cn(PAPER, 'flex items-center gap-1 p-1', i === 0 ? '-rotate-2' : 'translate-x-1 rotate-2')}>
                    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-status-teal text-white">
                        <Music2 className="size-2" />
                    </span>
                    <span className="h-1 flex-1 rounded-full bg-ink/15" />
                    {liked && <Heart className="size-2.5 shrink-0 fill-accent-pink text-accent-pink" />}
                </div>
            ))}
        </div>
    );
}

const ART: Record<VendorToolKey, () => ReactElement> = {
    schedule: ScheduleArt,
    announcement: AnnouncementArt,
    rsvpReport: RsvpReportArt,
    qr: QrArt,
    liveRequests: LiveRequestsArt,
};
