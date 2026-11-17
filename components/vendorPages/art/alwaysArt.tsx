import { Eye, Store } from 'lucide-react';

import type { VendorArt } from '@/components/vendorPages/art/VendorPageArt';
import { PAPER } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';
import type { VENDOR_ALWAYS } from '@/lib/vendorPages';

// The event's vendor list, with yours picked out.
function ListingArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex w-13 -rotate-2 flex-col gap-1 p-1.5')}>
                {[false, true, false].map((yours, i) => (
                    <div key={i} className={cn('flex items-center gap-1 rounded-sm', yours && 'bg-status-info/15')}>
                        <span className={cn('size-2.5 shrink-0 rounded-full', yours ? 'bg-status-info' : 'bg-ink/15')} />
                        <span className={cn('h-1 flex-1 rounded-full', yours ? 'bg-status-info/60' : 'bg-ink/15')} />
                    </div>
                ))}
            </div>
            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-status-info text-white shadow-sm">
                <Store className="size-3" />
            </span>
        </>
    );
}

// A post in the feed with the vendor's role next to the name.
function PostsArt() {
    return (
        <div className={cn(PAPER, 'flex w-13 rotate-3 flex-col gap-1 p-1.5')}>
            <div className="flex items-center gap-1">
                <span className="size-2.5 shrink-0 rounded-full [background-image:var(--brand-gradient)]" />
                <span className="h-1 w-4 rounded-full bg-ink/20" />
                <span className="h-1.5 w-3 rounded-full bg-status-warn" />
            </div>
            <span className="h-5 rounded-[3px] bg-status-warn/35" />
            <span className="h-1 w-7 rounded-full bg-ink/15" />
        </div>
    );
}

// Bars going up, watched by an eye.
function ReachArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex h-10 w-12 items-end gap-1 px-1.5 pb-1.5')}>
                {['h-2', 'h-3.5', 'h-5', 'h-6.5'].map((height, i) => (
                    <span key={height} className={cn('flex-1 rounded-t-[2px]', height, i === 3 ? 'bg-status-good' : 'bg-status-good/40')} />
                ))}
            </div>
            <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-card shadow-sm">
                <Eye className="size-3 text-status-good" />
            </span>
        </>
    );
}

// One page with the vendor's tools as tiles.
function MyPageArt() {
    return (
        <div className={cn(PAPER, 'flex w-13 -rotate-3 flex-col gap-1 p-1.5')}>
            <div className="flex items-center gap-1">
                <span className="size-2.5 shrink-0 rounded-full [background-image:var(--brand-gradient)]" />
                <span className="h-1 w-6 rounded-full bg-ink/20" />
            </div>
            <div className="grid grid-cols-2 gap-1">
                {['bg-status-violet/45', 'bg-status-info/40', 'bg-status-warn/50', 'bg-status-good/45'].map((tile) => (
                    <span key={tile} className={cn('h-3.5 rounded-[3px]', tile)} />
                ))}
            </div>
        </div>
    );
}

export const ALWAYS_ART: Record<(typeof VENDOR_ALWAYS)[number], VendorArt> = {
    listing: { Art: ListingArt, wash: 'bg-status-info-wash' },
    posts: { Art: PostsArt, wash: 'bg-status-warn-wash' },
    reach: { Art: ReachArt, wash: 'bg-status-good-wash' },
    myPage: { Art: MyPageArt, wash: 'bg-status-violet-wash' },
};
