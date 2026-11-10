'use client';

import { useLocale, useTranslations } from 'next-intl';

import { HEADING_SERIF } from '@/components/saveMyDate/storefront/storefrontStyles';
import { ThemeActions } from '@/components/saveMyDate/storefront/ThemeActions';
import { ThemeDetails } from '@/components/saveMyDate/storefront/ThemeDetails';
import { ThemePhotoCarousel } from '@/components/saveMyDate/storefront/ThemePhotoCarousel';
import { ThemeShareButtons } from '@/components/saveMyDate/storefront/ThemeShareButtons';
import type { Locale } from '@/i18n/config';
import { getInvitationThemePath } from '@/i18n/publicLocale';
import { type InvitationThemePage, themeEventTypeKey } from '@/lib/invitation/themeCatalogue';
import { absoluteUrl } from '@/lib/seo';
import { cn } from '@/lib/utils';

type ThemePageContentProps = { theme: InvitationThemePage };

// The theme's photos beside its name, sharing, what it includes and its buttons. Photos first on phones.
export function ThemePageContent({ theme }: ThemePageContentProps) {
    const t = useTranslations('SaveMyDateStorefront');
    const locale = useLocale() as Locale;
    const eventTypeKey = themeEventTypeKey(theme.eventType);
    const shareUrl = absoluteUrl(getInvitationThemePath(theme.slug, locale));
    const shareText = t('theme.metaTitle', { name: theme.name, eventType: theme.eventType });

    return (
        <div className="grid gap-8 min-[761px]:grid-cols-2 min-[761px]:items-start min-[761px]:gap-12">
            {/* Photos */}
            <ThemePhotoCarousel theme={theme} />

            {/* Details */}
            <div className="flex flex-col gap-6 min-[761px]:pt-6">
                {/* Name and event type */}
                <div>
                    <h1 className={cn(HEADING_SERIF, 'm-0 text-[clamp(34px,9vw,44px)] leading-[1.02] min-[761px]:text-[clamp(44px,3.6vw,56px)]')}>{theme.name}</h1>
                    {eventTypeKey ? <p className="mt-2 mb-0 text-[15px] text-[#151313]/60">{t(`eventTypes.${eventTypeKey}`)}</p> : null}
                </div>

                {/* Share */}
                <ThemeShareButtons text={shareText} url={shareUrl} />

                {/* What's included, how it works */}
                <ThemeDetails />

                {/* Live demo and try it free */}
                <ThemeActions slug={theme.slug} />
            </div>
        </div>
    );
}
