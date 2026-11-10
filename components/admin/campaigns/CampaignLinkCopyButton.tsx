'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminTipBubble } from '@/components/admin/AdminTipBubble';
import { useAdminInfoTip } from '@/hooks/useAdminInfoTip';
import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';

// Copies a link's address from a row. `label` names the link for screen readers ("Copy link Instagram
// Story EL"); the bubble on hover, focus or tap shows the action alone, and says it's copied after a
// tap. Same size as before, so the old pages look the same.
export function CampaignLinkCopyButton({ url, label }: { url: string; label: string }) {
    const t = useTranslations('AdminPage.campaigns.share');
    const { copied, handleCopyClick } = useCampaignLinkShare(url, label);
    const { open: tipOpen, triggerRef, bubbleRef, handlers } = useAdminInfoTip();
    const action = copied ? t('copied') : t('copy');

    return (
        <>
            {/* Copy */}
            <button
                ref={triggerRef}
                type="button"
                onClick={handleCopyClick}
                onPointerEnter={handlers.handlePointerEnter}
                onPointerLeave={handlers.handlePointerLeave}
                onPointerUp={handlers.handlePointerUp}
                onFocus={handlers.handleFocus}
                onBlur={handlers.handleBlur}
                aria-label={`${action} ${label}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
            >
                {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
            </button>

            {/* Action */}
            {tipOpen && <AdminTipBubble bubbleRef={bubbleRef} text={action} />}
        </>
    );
}
