import { Heart } from 'lucide-react';

import { type VendorArt, VendorPageArt } from '@/components/vendorPages/art/VendorPageArt';
import { PAPER } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';

// An invitation card sliding out of its envelope, drawn like the vendor tools.
function InvitationCardArt() {
    return (
        <>
            {/* Card */}
            <div className={cn(PAPER, 'absolute top-2.5 flex w-10 -rotate-3 flex-col items-center gap-1 px-1.5 pt-1.5 pb-4')}>
                <span className="h-3.5 w-full rounded-[3px] bg-accent-pink/35" />
                <span className="h-1 w-6 rounded-full bg-accent-pink/60" />
                <span className="h-1 w-4 rounded-full bg-ink/15" />
            </div>
            {/* Envelope, its flap folded down */}
            <div className={cn(PAPER, 'absolute bottom-2.5 h-7 w-13 overflow-hidden rounded-sm')}>
                <span className="absolute top-0 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink/10 bg-card" />
            </div>
            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-accent-pink text-white shadow-sm">
                <Heart className="size-3 fill-current" />
            </span>
        </>
    );
}

const INVITATION_ART: VendorArt = { Art: InvitationCardArt, wash: 'bg-status-warn-wash' };

// The drawing as an image, so it carries its own alt text.
export function InvitationArt({ alt, className }: { alt: string; className?: string }) {
    return (
        <div role="img" aria-label={alt} className={className}>
            <VendorPageArt art={INVITATION_ART} />
        </div>
    );
}
