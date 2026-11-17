import { BookHeart, Camera, Check, type LucideIcon, MailOpen, Share2, Store } from 'lucide-react';

import type { FeedQuickActionKey } from '@/lib/feedQuickActions';
import { cn } from '@/lib/utils';

// A quick action's icon, drawn like VendorToolIcon: a wash with the sign on a small paper card. Decoration only:
// the label under it names the action. done swaps the sign for a check (the link was copied).
export function FeedActionIcon({ action, done = false }: { action: FeedQuickActionKey; done?: boolean }) {
    const { icon, wash, ink } = ICONS[action];
    const Icon = done ? Check : icon;

    return (
        <span aria-hidden="true" className={cn('flex size-12 shrink-0 items-center justify-center rounded-[0.875rem]', wash)}>
            <span className="flex size-8 -rotate-6 items-center justify-center rounded-md bg-card shadow-sm ring-1 ring-ink/5">
                <Icon className={cn('size-4.5', ink)} strokeWidth={2.25} />
            </span>
        </span>
    );
}

const ICONS: Record<FeedQuickActionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    invitation: { icon: MailOpen, wash: 'bg-accent-pink/12', ink: 'text-accent-pink' },
    photos: { icon: Camera, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    wishbook: { icon: BookHeart, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
    share: { icon: Share2, wash: 'bg-status-good-wash', ink: 'text-status-good' },
    vendors: { icon: Store, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
};
