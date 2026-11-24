import { ArrowUpDown, ImagePlus, type LucideIcon, Palette, Type, Users } from 'lucide-react';

import { WashCardIcon } from '@/components/ui/WashCardIcon';
import type { FeedEditFeature } from '@/lib/feedEditBanner';

// One thing hosts can change on their feed, drawn like the feed's quick actions. Decoration only: the label names it.
export function FeedEditFeatureIcon({ feature }: { feature: FeedEditFeature }) {
    const { icon, wash, ink } = ICONS[feature];
    return <WashCardIcon icon={icon} wash={wash} ink={ink} />;
}

const ICONS: Record<FeedEditFeature, { icon: LucideIcon; wash: string; ink: string }> = {
    themes: { icon: Palette, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    text: { icon: Type, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    photos: { icon: ImagePlus, wash: 'bg-status-teal-wash', ink: 'text-status-teal' },
    order: { icon: ArrowUpDown, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    membersOnly: { icon: Users, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
};
