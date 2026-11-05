import { createElement } from 'react';

import { campaignPlatformIcon } from '@/lib/campaignIcons';
import { cn } from '@/lib/utils';

// Decorative: the link's name and source say the same in words.
export function CampaignPlatformIcon({ source, medium, className }: { source: string | null; medium: string | null; className?: string }) {
    return createElement(campaignPlatformIcon(source, medium), {
        'aria-hidden': true,
        className: cn('h-3.5 w-3.5 shrink-0 text-ink-muted', className),
    });
}
