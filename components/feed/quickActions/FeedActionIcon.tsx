import { BookHeart, Camera, Check, type LucideIcon, MailOpen, Share2, Store } from 'lucide-react';

import { WashCardIcon } from '@/components/ui/WashCardIcon';
import type { FeedQuickActionKey } from '@/lib/feedQuickActions';

// A quick action's icon, drawn like VendorToolIcon. Decoration only: the label under it names the action.
// done swaps the sign for a check (the link was copied).
export function FeedActionIcon({ action, done = false }: { action: FeedQuickActionKey; done?: boolean }) {
    const { icon, wash, ink } = ICONS[action];
    return <WashCardIcon icon={done ? Check : icon} wash={wash} ink={ink} />;
}

const ICONS: Record<FeedQuickActionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    invitation: { icon: MailOpen, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    photos: { icon: Camera, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    wishbook: { icon: BookHeart, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    share: { icon: Share2, wash: 'bg-status-good-wash', ink: 'text-status-good' },
    vendors: { icon: Store, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
};
