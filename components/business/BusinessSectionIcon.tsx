import { CalendarDays, ChartNoAxesColumn, Eye, Images, type LucideIcon, Mail, Printer } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BusinessSectionKey = 'insights' | 'events' | 'content' | 'printPrices' | 'previews' | 'contact';

// A section's sign on its colored tile, in the style of the event page's tool icons (same size as VendorToolIcon's
// 'md'). Decoration only: the section title next to it names it.
export function BusinessSectionIcon({ section, className }: { section: BusinessSectionKey; className?: string }) {
    const { icon: Icon, wash, ink } = TILES[section];

    return (
        <span aria-hidden="true" className={cn('flex size-12 shrink-0 items-center justify-center rounded-[0.875rem]', wash, className)}>
            <span className="flex size-8 -rotate-6 items-center justify-center rounded-md bg-card shadow-sm ring-1 ring-ink/5">
                <Icon className={cn('size-4.5', ink)} strokeWidth={2.25} />
            </span>
        </span>
    );
}

const TILES: Record<BusinessSectionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    insights: { icon: ChartNoAxesColumn, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    events: { icon: CalendarDays, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
    content: { icon: Images, wash: 'bg-status-teal-wash', ink: 'text-status-teal' },
    printPrices: { icon: Printer, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    previews: { icon: Eye, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    contact: { icon: Mail, wash: 'bg-status-good-wash', ink: 'text-status-good' },
};
