'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';
import type { CampaignLinkDto } from '@/lib/api/types';
import { campaignShortUrl } from '@/lib/campaignLinks';

// Copies a saved link's short address from a table row.
export function CampaignLinkCopyButton({ link }: { link: Pick<CampaignLinkDto, 'name' | 'shortCode'> }) {
    const t = useTranslations('AdminPage.campaigns.share');
    const { copied, handleCopyClick } = useCampaignLinkShare(campaignShortUrl(link), link.name);

    return (
        <button
            type="button"
            onClick={handleCopyClick}
            aria-label={`${copied ? t('copied') : t('copy')} ${link.name}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
        >
            {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
        </button>
    );
}
