import { BriefcaseBusiness, Building2, Camera, ClipboardList, Flower2, Headphones, type LucideIcon, UtensilsCrossed, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { PartnerRole } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { tabBoxClass, tabIconBoxClass, TabLabel } from './TabLabel';

// The vendor's own page, named and drawn after their type ("Photographer", "Music") so they know their tools are there.
export function VendorTab({ href, vendorType, active }: { href: string; vendorType: PartnerRole; active: boolean }) {
    const t = useTranslations('Vendors.types');
    const Icon = TYPE_ICONS[vendorType];
    const label = t(vendorType);

    return (
        <AppLink
            href={href}
            className={cn('flex flex-col items-center gap-0.5 py-1', tabBoxClass(true))}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
        >
            <span
                className={cn(
                    'flex items-center justify-center transition-all duration-200',
                    tabIconBoxClass(true),
                    active ? 'scale-105 opacity-100' : 'scale-100 opacity-50',
                )}
            >
                <Icon className="h-5.5 w-5.5 text-ink" aria-hidden="true" />
            </span>
            <TabLabel label={label} active={active} />
        </AppLink>
    );
}

// Headphones for music, so it doesn't look like the playlist tab's note.
const TYPE_ICONS: Record<PartnerRole, LucideIcon> = {
    PHOTOGRAPHER: Camera,
    VIDEOGRAPHER: Video,
    MUSIC: Headphones,
    DECORATION: Flower2,
    CATERING: UtensilsCrossed,
    VENUE: Building2,
    PLANNER: ClipboardList,
    OTHER: BriefcaseBusiness,
};
