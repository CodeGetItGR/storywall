import { Heart, MailCheck, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { PAPER } from '@/components/vendors/me/VendorToolArt';
import { cn } from '@/lib/utils';

// Small drawings for the home page's empty states, in the style of the vendor tool drawings. Decoration only: the text
// next to them says what to do.
function HomeArtTile({ children, wash }: { children: ReactNode; wash: string }) {
    return (
        <div aria-hidden="true" className={cn('relative size-28 shrink-0 overflow-hidden rounded-3xl', wash)}>
            {children}
        </div>
    );
}

// An envelope with a letter peeking out.
export function VerifyEmailArt() {
    return (
        <HomeArtTile wash="bg-status-info-wash">
            <div className="absolute bottom-6 left-1/2 h-12 w-18 -translate-x-1/2 rounded-md bg-status-info/25" />
            <div className={cn(PAPER, 'absolute top-5 left-1/2 flex h-12 w-14 -translate-x-1/2 -rotate-3 flex-col gap-1.5 p-2')}>
                <span className="h-1 w-8 rounded-full bg-status-info/60" />
                <span className="h-1 w-10 rounded-full bg-ink/15" />
                <span className="h-1 w-6 rounded-full bg-ink/15" />
            </div>
            <div className="absolute bottom-6 left-1/2 h-12 w-18 -translate-x-1/2 drop-shadow-sm">
                <div className="size-full rounded-md bg-card [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)]" />
            </div>
            <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-status-info text-white shadow-sm">
                <MailCheck className="size-3.5" />
            </span>
        </HomeArtTile>
    );
}

// An empty invitation card waiting for a photo.
export function NoEventsArt() {
    return (
        <HomeArtTile wash="bg-accent">
            <div className={cn(PAPER, 'absolute top-5 left-7 h-18 w-14 -rotate-8 bg-card/70')} />
            <div className={cn(PAPER, 'absolute top-4 left-1/2 flex w-15 -translate-x-1/2 rotate-3 flex-col gap-1.5 p-1.5')}>
                <span className="h-8 rounded-sm border border-dashed border-ink/20" />
                <span className="h-1.5 w-9 rounded-full bg-ink/20" />
                <span className="h-1 w-6 rounded-full bg-ink/15" />
            </div>
            <Heart className="absolute top-4 left-4 size-3.5 -rotate-12 fill-accent-pink text-accent-pink" />
            <span className="absolute right-4 bottom-4 flex size-8 items-center justify-center rounded-full text-white shadow-sm bg-gradient-brand">
                <Plus className="size-4" strokeWidth={2.5} />
            </span>
        </HomeArtTile>
    );
}
