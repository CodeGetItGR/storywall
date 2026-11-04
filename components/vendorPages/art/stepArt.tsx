import { Link2, Pencil, QrCode } from 'lucide-react';

import type { VendorArt } from '@/components/vendorPages/art/VendorPageArt';
import { PAPER } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';

// A message with the vendor's link, and its QR behind it.
function LinkArt() {
    return (
        <>
            <div className={cn(PAPER, 'absolute top-2.5 right-2.5 flex size-7 rotate-8 items-center justify-center')}>
                <QrCode className="size-5 text-status-info" strokeWidth={2.25} />
            </div>
            <div className={cn(PAPER, 'relative mt-4 -ml-2 flex w-11 -rotate-3 items-center gap-1 rounded-lg rounded-bl-none p-1.5')}>
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-status-info text-white">
                    <Link2 className="size-2.5" />
                </span>
                <span className="h-1 flex-1 rounded-full bg-status-info/50" />
            </div>
        </>
    );
}

// The business details being filled in: a logo and two fields.
function DetailsArt() {
    return (
        <>
            <div className={cn(PAPER, 'flex w-13 rotate-2 flex-col gap-1.5 p-1.5')}>
                <span className="size-4 rounded-full border border-dashed border-status-warn bg-status-warn/15" />
                {['w-full', 'w-7'].map((width) => (
                    <span key={width} className={cn('h-2 rounded-[3px] ring-1 ring-ink/15', width)} />
                ))}
            </div>
            <span className="absolute right-2 bottom-2 flex size-5 items-center justify-center rounded-full bg-status-warn text-white shadow-sm">
                <Pencil className="size-2.5" />
            </span>
        </>
    );
}

// "My page" open on a phone.
function PhoneArt() {
    return (
        <div className="flex h-14 w-9 rotate-6 flex-col gap-1 rounded-lg bg-card p-1 shadow-sm ring-2 ring-ink/70">
            <span className="mx-auto h-0.5 w-3 rounded-full bg-ink/30" />
            <div className="grid grid-cols-2 gap-0.5">
                {['bg-status-violet/45', 'bg-status-info/40', 'bg-status-warn/50', 'bg-status-good/45'].map((tile) => (
                    <span key={tile} className={cn('h-3 rounded-[2px]', tile)} />
                ))}
            </div>
            <span className="h-1 w-5 rounded-full bg-ink/15" />
        </div>
    );
}

// One per VendorPages.steps item, in order.
export const STEP_ART: readonly VendorArt[] = [
    { Art: LinkArt, wash: 'bg-status-info-wash' },
    { Art: DetailsArt, wash: 'bg-status-warn-wash' },
    { Art: PhoneArt, wash: 'bg-status-good-wash' },
];
