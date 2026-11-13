'use client';

import { useTranslations } from 'next-intl';

import { FeedActionIcon } from '@/components/feed/quickActions/FeedActionIcon';
import { QuickActionTile } from '@/components/feed/quickActions/QuickActionTile';
import { VendorToolIcon } from '@/components/vendors/VendorToolIcon';
import { type FeedQuickAction, useFeedQuickActions } from '@/hooks/useFeedQuickActions';
import { useScrollEdges } from '@/hooks/useScrollEdges';
import { useVendorQuickActions } from '@/hooks/useVendorQuickActions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { edgeFadeMask } from '@/lib/feedQuickActions';

// The feed's quick actions, under the composer. A vendor gets their own tools first, in the same row.
export function FeedQuickActions({ event, isHost }: { event: EventDetailResponseDto; isHost: boolean }) {
    const t = useTranslations('Vendors');
    const tFeed = useTranslations('FeedQuickActions');
    const actions = useFeedQuickActions(event);
    const vendorActions = useVendorQuickActions(event.id, isHost);
    const { track, before, after } = useScrollEdges<HTMLUListElement>();
    const mask = edgeFadeMask({ before, after });

    if (vendorActions.length === 0) {
        if (actions.length === 0) return null;
        return (
            // At most five, so they always fit one row: spread evenly whatever the count.
            <ul className="mt-3 flex justify-evenly px-2">
                {actions.map((action) => (
                    <FeedActionItem key={action.key} action={action} />
                ))}
            </ul>
        );
    }

    return (
        // A vendor's row is longer than a phone screen: it scrolls sideways, and an edge with more tiles past it fades out.
        <ul
            ref={track}
            className="mt-3 no-scrollbar flex items-start gap-1 overflow-x-auto px-2"
            style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        >
            {/* Vendor tools: the feed's tile says just RSVP */}
            {vendorActions.map((action) => (
                <li key={action.key} className="shrink-0">
                    <QuickActionTile
                        icon={<VendorToolIcon tool={action.key} />}
                        label={action.key === 'rsvpReport' ? tFeed('rsvpReport') : t(`quickActions.${action.key}`)}
                        href={action.href}
                    />
                </li>
            ))}

            {/* Divider */}
            {actions.length > 0 && <li aria-hidden="true" className="mx-1.5 mt-3 h-10 w-px shrink-0 bg-border" />}

            {/* Quick actions */}
            {actions.map((action) => (
                <FeedActionItem key={action.key} action={action} />
            ))}
        </ul>
    );
}

function FeedActionItem({ action }: { action: FeedQuickAction }) {
    return (
        <li className="shrink-0">
            <QuickActionTile
                icon={<FeedActionIcon action={action.key} done={action.done} />}
                label={action.label}
                href={action.href}
                onClick={action.onClick}
            />
        </li>
    );
}
