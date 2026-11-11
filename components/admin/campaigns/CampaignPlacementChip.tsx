'use client';

import type { ChangeEvent } from 'react';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { CampaignLinkTypeIcon } from '@/components/admin/campaigns/CampaignLinkTypeIcon';
import { CampaignPlatformIcon } from '@/components/admin/campaigns/CampaignPlatformIcon';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';
import type { CampaignPlacementOption } from '@/lib/campaignLinks';
import { cn } from '@/lib/utils';

const CHIP =
    'inline-flex min-h-10 min-w-12 items-center justify-center gap-1 rounded-md border px-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30';

// One placement to tick, drawn as its platform and type icons. Its words ("Instagram Story") name the
// checkbox and show on hover, focus or tap; a tap still ticks it. One the campaign already has shows
// ticked and faded, and can't be changed.
export function CampaignPlacementChip({
    option,
    added,
    checked,
    name,
    onChangeAction,
}: {
    option: CampaignPlacementOption;
    added: boolean;
    checked: boolean;
    name: string;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const { open: tipOpen, triggerRef, bubbleRef, handlers } = useAdminInfoTip<HTMLLabelElement>();

    return (
        <>
            {/* Chip */}
            <label
                ref={triggerRef}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onPointerUp={handlers.handlePointerUp}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
                className={cn(
                    CHIP,
                    checked ? 'border-ink bg-canvas ring-1 ring-ink' : 'border-border bg-card hover:border-ink-faint',
                    added ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
            >
                <input
                    type="checkbox"
                    className="sr-only"
                    value={option.placement}
                    checked={checked}
                    disabled={added}
                    aria-label={name}
                    onChange={onChangeAction}
                />
                <CampaignPlatformIcon platform={option.platform} decorative />
                {option.type && <CampaignLinkTypeIcon type={option.type} decorative />}
            </label>

            {/* Words */}
            {tipOpen && <AdminTipBubble bubbleRef={bubbleRef} text={name} />}
        </>
    );
}
