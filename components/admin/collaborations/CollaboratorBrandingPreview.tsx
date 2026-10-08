'use client';

import { useTranslations } from 'next-intl';

import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';
import type { Locale } from '@/i18n/config';
import type { BrandingVariant } from '@/lib/api/types';

const PREVIEW_VARIANTS: readonly BrandingVariant[] = ['FEATURE_CARD', 'COMPACT_ROW', 'CREDIT'];

// The three card designs, drawn with the real feed components.
export function CollaboratorBrandingPreview({
    content,
    locale,
    onLocaleChangeAction,
}: {
    content: PartnerBrandingCardContent;
    locale: Locale;
    onLocaleChangeAction: (locale: Locale) => void;
}) {
    const t = useTranslations('AdminPage.collaborations.feedCard.preview');
    const tVariants = useTranslations('AdminPage.feedCardVariants');
    const localeOptions = [
        { value: 'el' as const, label: t('locales.el') },
        { value: 'en' as const, label: t('locales.en') },
    ];

    return (
        <section className="space-y-3">
            {/* Heading */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{t('title')}</h3>
                <FunnelSegmented label={t('language')} options={localeOptions} value={locale} onChangeAction={onLocaleChangeAction} />
            </div>

            {/* Variants */}
            <div className="space-y-4">
                {PREVIEW_VARIANTS.map((variant) => (
                    <figure key={variant} className="space-y-1.5">
                        <figcaption className="text-xs font-medium text-ink-muted">{tVariants(variant)}</figcaption>
                        <div className="overflow-hidden rounded-lg bg-event ring-1 ring-border">
                            <PartnerCardVariant variant={variant} content={content} />
                        </div>
                    </figure>
                ))}
            </div>
        </section>
    );
}
