import { BadgeCheck, Heart, MessageCircle, Percent, Tag, Wallet } from 'lucide-react';

import type { VendorArt } from '@/components/vendorPages/art/VendorPageArt';
import { PAPER } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';
import type { VendorPartnerPerk } from '@/lib/vendorPages';

// A discount ticket, notched on both sides.
function DiscountArt() {
    return (
        <div className={cn(PAPER, 'relative flex h-9 w-14 -rotate-6 items-center gap-1.5 px-2')}>
            <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-status-warn-wash" />
            <span className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rounded-full bg-status-warn-wash" />
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-status-warn text-white">
                <Percent className="size-3" strokeWidth={3} />
            </span>
            <span className="h-full border-l border-dashed border-ink/20" />
            <div className="flex flex-1 flex-col gap-1">
                <span className="h-1 w-full rounded-full bg-status-warn/60" />
                <span className="h-1 w-3 rounded-full bg-ink/15" />
            </div>
        </div>
    );
}

// The vendor's card between the posts in the feed.
function FeedCardArt() {
    return (
        <>
            <div className={cn(PAPER, 'absolute top-2.5 h-4 w-11 opacity-70')} />
            <div className={cn(PAPER, 'relative mt-3 flex w-13 flex-col gap-1 p-1.5')}>
                <div className="flex items-center gap-1">
                    <span className="size-3 shrink-0 rounded-full [background-image:var(--brand-gradient)]" />
                    <span className="h-1 flex-1 rounded-full bg-ink/20" />
                    <BadgeCheck className="size-3 shrink-0 text-status-info" />
                </div>
                <span className="h-2 w-7 rounded-full bg-status-info/40" />
            </div>
        </>
    );
}

// Views with reactions and comments on top.
function FullReachArt() {
    return (
        <>
            <div className={cn(PAPER, 'mt-2 flex h-9 w-12 items-end gap-1 px-1.5 pb-1.5')}>
                {['h-2.5', 'h-4', 'h-3', 'h-5.5'].map((height) => (
                    <span key={height} className={cn('flex-1 rounded-t-[2px] bg-status-good/50', height)} />
                ))}
            </div>
            <span className="absolute top-2 left-2.5 flex size-5 items-center justify-center rounded-full bg-card shadow-sm">
                <Heart className="size-3 fill-accent-pink text-accent-pink" />
            </span>
            <span className="absolute top-3 right-2.5 flex size-5 items-center justify-center rounded-full bg-status-good text-white shadow-sm">
                <MessageCircle className="size-3" />
            </span>
        </>
    );
}

// A price per print size.
function PrintPricesArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex w-13 rotate-2 flex-col gap-1.5 p-1.5')}>
                {['h-2.5 w-2', 'h-3 w-2.5', 'h-3.5 w-3'].map((size) => (
                    <div key={size} className="flex items-center gap-1">
                        <span className={cn('shrink-0 rounded-[2px] bg-status-teal/45', size)} />
                        <span className="h-1 flex-1 rounded-full bg-ink/15" />
                        <span className="h-1.5 w-2.5 rounded-full bg-status-teal" />
                    </div>
                ))}
            </div>
            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-status-teal text-white shadow-sm">
                <Tag className="size-3" />
            </span>
        </>
    );
}

// Every event the partner worked, in one place.
function PortalArt() {
    return (
        <>
            <div className="flex w-13 flex-col gap-1">
                {['-rotate-2', 'translate-x-1 rotate-1', '-rotate-1'].map((tilt, i) => (
                    <div key={tilt} className={cn(PAPER, 'flex items-center gap-1 p-1', tilt)}>
                        <span className={cn('size-2 shrink-0 rounded-full', i === 0 ? 'bg-status-violet' : 'bg-status-violet/40')} />
                        <span className="h-1 flex-1 rounded-full bg-ink/15" />
                    </div>
                ))}
            </div>
            <span className="absolute right-2 bottom-2 flex size-5 items-center justify-center rounded-full bg-status-violet text-white shadow-sm">
                <Wallet className="size-3" />
            </span>
        </>
    );
}

export const PARTNER_ART: Record<VendorPartnerPerk, VendorArt> = {
    discount: { Art: DiscountArt, wash: 'bg-status-warn-wash' },
    feedCard: { Art: FeedCardArt, wash: 'bg-status-info-wash' },
    fullReach: { Art: FullReachArt, wash: 'bg-status-good-wash' },
    printPrices: { Art: PrintPricesArt, wash: 'bg-status-teal-wash' },
    portal: { Art: PortalArt, wash: 'bg-status-violet-wash' },
};
