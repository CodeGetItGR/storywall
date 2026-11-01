import { Clock, Eye, Images, ListChecks, type LucideIcon, Megaphone, Music2, Printer, QrCode } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { VendorActionKey } from '@/lib/vendors';

// The small version of a vendor tool's drawing, for buttons and menus: the drawing's wash with its main sign on a paper
// card. 'sm' drops the card so the sign stays readable at menu size. Decoration only: the label next to it names the tool.
export function VendorToolIcon({ tool, size = 'md', className }: { tool: VendorActionKey; size?: 'sm' | 'md'; className?: string }) {
    const { icon: Icon, wash, ink } = MINI[tool];

    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex shrink-0 items-center justify-center',
                size === 'md' ? 'size-12 rounded-[0.875rem]' : 'size-6 rounded-md',
                wash,
                className,
            )}
        >
            {size === 'md' ? (
                <span className="flex size-8 -rotate-6 items-center justify-center rounded-md bg-card shadow-sm ring-1 ring-ink/5">
                    <Icon className={cn('size-4.5', ink)} strokeWidth={2.25} />
                </span>
            ) : (
                <Icon className={cn('size-3.5', ink)} strokeWidth={2.25} />
            )}
        </span>
    );
}

// The same washes and colours as the vendor page's drawings. The photo work has no drawing yet; its colours only
// need to differ from each other, since one vendor type never has both those and the planner's tools.
const MINI: Record<VendorActionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    schedule: { icon: Clock, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    announcement: { icon: Megaphone, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    rsvpReport: { icon: ListChecks, wash: 'bg-status-good-wash', ink: 'text-status-good' },
    qr: { icon: QrCode, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
    liveRequests: { icon: Music2, wash: 'bg-status-teal-wash', ink: 'text-status-teal' },
    proAlbum: { icon: Images, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    sneakPeek: { icon: Eye, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    prints: { icon: Printer, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
};
