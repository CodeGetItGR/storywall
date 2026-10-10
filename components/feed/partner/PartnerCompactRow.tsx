import { ChevronRight } from 'lucide-react';

import { PartnerCardLabel } from '@/components/feed/partner/PartnerCardLabel';
import { PartnerCardLink } from '@/components/feed/partner/PartnerCardLink';
import { PartnerLogo } from '@/components/feed/partner/PartnerLogo';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';

// Variant COMPACT_ROW: logo, name, services line and a chevron.
export function PartnerCompactRow({ content }: { content: PartnerBrandingCardContent }) {
    return (
        <article className="border-b border-event-card-line bg-event-card px-2 py-3">
            <PartnerCardLink
                href={content.href}
                newTabLabel={content.newTabLabel}
                className="flex min-h-16 items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border transition-colors hover:bg-surface-muted"
            >
                {/* Logo */}
                <PartnerLogo src={content.logoUrl} size={44} />

                {/* Partner */}
                <div className="min-w-0 flex-1">
                    <PartnerCardLabel partnerLabel={content.partnerLabel} roleLabel={content.roleLabel} />
                    <p className="truncate text-sm font-bold text-ink">{content.name}</p>
                    <p className="truncate text-xs text-ink-muted">{content.services}</p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
            </PartnerCardLink>
        </article>
    );
}
