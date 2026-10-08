import { PartnerCardLabel } from '@/components/feed/partner/PartnerCardLabel';
import { PartnerCardLink } from '@/components/feed/partner/PartnerCardLink';
import { PartnerLogo } from '@/components/feed/partner/PartnerLogo';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';

// Variant CREDIT: a small credit line with the logo.
export function PartnerCredit({ content }: { content: PartnerBrandingCardContent }) {
    return (
        <article className="border-b border-event-card-line bg-event-card px-4 py-3">
            <PartnerCardLink
                href={content.href}
                newTabLabel={content.newTabLabel}
                className="mx-auto flex min-h-11 w-fit max-w-full items-center gap-2 rounded-full px-2 text-xs text-ink-muted transition-colors hover:text-ink"
            >
                <PartnerLogo src={content.logoUrl} size={24} />
                <PartnerCardLabel partnerLabel={content.partnerLabel} roleLabel={content.roleLabel} className="shrink-0" />
                <span className="min-w-0 truncate font-semibold text-ink">{content.name}</span>
            </PartnerCardLink>
        </article>
    );
}
