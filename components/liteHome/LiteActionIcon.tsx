import { Check, Download, type LucideIcon, QrCode, Share2, Sparkles } from 'lucide-react';

import type { LiteQuickActionKey } from '@/hooks/useLiteHome';
import { cn } from '@/lib/utils';

// A quick action's icon, drawn like VendorToolIcon: a wash with the sign on a small paper card. Decoration only:
// the label next to it names the action. done swaps the sign for a check (the link was copied).
export function LiteActionIcon({ action, done = false }: { action: LiteQuickActionKey; done?: boolean }) {
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

const ICONS: Record<LiteQuickActionKey, { icon: LucideIcon; wash: string; ink: string }> = {
    qr: { icon: QrCode, wash: 'bg-status-violet-wash', ink: 'text-status-violet' },
    share: { icon: Share2, wash: 'bg-status-info-wash', ink: 'text-status-info' },
    download: { icon: Download, wash: 'bg-status-good-wash', ink: 'text-status-good' },
    upgrade: { icon: Sparkles, wash: 'bg-status-warn-wash', ink: 'text-status-warn' },
};
