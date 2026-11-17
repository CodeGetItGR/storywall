'use client';

import { ChevronRight } from 'lucide-react';
import type { MouseEvent } from 'react';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { CampaignLinkCopyButton } from '@/components/admin/campaigns/CampaignLinkCopyButton';
import { CampaignLinkLabel } from '@/components/admin/campaigns/CampaignLinkLabel';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';
import type { CampaignLinkRow as CampaignLinkRowData } from '@/hooks/useCampaignLinks';

// One link in the drawer: its marks open it, and the button beside them copies its address. The row's
// words ("Instagram Story EL") name it and show on hover or keyboard focus; a tap opens the link, so it
// shows no bubble.
export function CampaignLinkRow({ row, onOpenAction }: { row: CampaignLinkRowData; onOpenAction: (event: MouseEvent<HTMLButtonElement>) => void }) {
    const { open: tipOpen, triggerRef, bubbleRef, handlers } = useAdminInfoTip();

    return (
        <li className="flex items-center gap-1 py-1">
            {/* Link */}
            <button
                ref={triggerRef}
                type="button"
                value={row.link.id}
                onClick={onOpenAction}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
                aria-label={row.name}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left hover:bg-canvas"
            >
                <CampaignLinkLabel label={row.label} decorative />
                <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-ink-faint" />
            </button>
            {tipOpen && <AdminTipBubble bubbleRef={bubbleRef} text={row.name} />}

            {/* Copy */}
            <CampaignLinkCopyButton url={row.url} label={row.name} />
        </li>
    );
}
