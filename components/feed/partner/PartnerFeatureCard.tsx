import { ArrowUpRight } from 'lucide-react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { PartnerCardLabel } from '@/components/feed/partner/PartnerCardLabel';
import { PartnerCardLink } from '@/components/feed/partner/PartnerCardLink';
import { PartnerLogo } from '@/components/feed/partner/PartnerLogo';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';

// Variant FEATURE_CARD: cover photo, tagline and a button.
export function PartnerFeatureCard({ content }: { content: PartnerBrandingCardContent }) {
    return (
        <article className="border-b border-event-card-line bg-event-card px-2 py-4">
            <PartnerCardLink
                href={content.href}
                newTabLabel={content.newTabLabel}
                className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border"
            >
                {/* Cover */}
                <div className="relative aspect-[16/9] w-full bg-surface-muted">
                    {content.coverUrl && (
                        <ProtectedImage src={content.coverUrl} alt="" fill sizes="(min-width: 1024px) 672px, 100vw" className="object-cover" />
                    )}
                </div>

                {/* Partner */}
                <div className="flex items-center gap-3 px-4 pt-3">
                    <PartnerLogo src={content.logoUrl} size={40} />
                    <div className="min-w-0">
                        <PartnerCardLabel partnerLabel={content.partnerLabel} roleLabel={content.roleLabel} />
                        <p className="truncate text-sm font-bold text-ink">{content.name}</p>
                    </div>
                </div>

                {/* Tagline */}
                <p className="px-4 pt-2 text-sm leading-relaxed text-ink">{content.tagline}</p>

                {/* Action */}
                <div className="px-4 pt-3 pb-4">
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-opacity group-hover:opacity-90">
                        {content.visitLabel}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                </div>
            </PartnerCardLink>
        </article>
    );
}
