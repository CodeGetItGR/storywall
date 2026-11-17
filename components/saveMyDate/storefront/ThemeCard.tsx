import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/saveMyDate/storefront/storefrontStyles';
import { AppLink as Link } from '@/components/ui/AppLink';
import type { CatalogueColumns } from '@/hooks/useThemeCatalogueColumns';
import type { Locale } from '@/i18n/config';
import { getInvitationThemePath } from '@/i18n/publicLocale';
import type { InvitationThemeCardDto } from '@/lib/invitation/themeCatalogue';
import { themeCardBackground, themeEventTypeKey } from '@/lib/invitation/themeCatalogue';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type ThemeCardProps = {
    theme: InvitationThemeCardDto;
    columns: CatalogueColumns;
    // The first row loads at once: it is what the visitor sees first.
    preload?: boolean;
};

// One theme in the catalogue: its card image, name and event type, and its two buttons.
export function ThemeCard({ theme, columns, preload = false }: ThemeCardProps) {
    const t = useTranslations('SaveMyDateStorefront');
    const locale = useLocale() as Locale;
    const href = getInvitationThemePath(theme.slug, locale);
    const eventTypeKey = themeEventTypeKey(theme.eventType);
    const alt = t('catalogue.cardAlt', { name: theme.name });

    return (
        <article className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(21,19,19,.06),0_12px_32px_rgba(21,19,19,.07)]">
            {/* Card image */}
            <Link className="block focus-ring" href={href} tabIndex={-1} aria-hidden>
                <div className="relative aspect-[9/15.6] overflow-hidden" style={{ background: themeCardBackground(theme.cardColor) }}>
                    {theme.cardThumbUrl ? (
                        <Image
                            fill
                            alt={alt}
                            className="object-cover"
                            preload={preload}
                            sizes={columns === 2 ? '(max-width: 650px) 50vw, (max-width: 980px) 50vw, (max-width: 1220px) 33vw, 300px' : '(max-width: 650px) 100vw, (max-width: 980px) 50vw, (max-width: 1220px) 33vw, 300px'}
                            src={theme.cardThumbUrl}
                        />
                    ) : null}
                </div>
            </Link>

            {/* Name and event type */}
            <div className={cn('flex flex-1 flex-col gap-1 px-4 pt-4', columns === 2 && 'max-[650px]:px-3 max-[650px]:pt-3')}>
                <h2 className="m-0 text-[17px] leading-tight font-semibold text-[#151313]">
                    <Link className="focus-ring hover:underline" href={href}>
                        {theme.name}
                    </Link>
                </h2>
                {eventTypeKey ? <p className="m-0 text-sm text-[#151313]/60">{t(`eventTypes.${eventTypeKey}`)}</p> : null}
            </div>

            {/* Actions */}
            <div className={cn('grid gap-2 p-4', columns === 2 ? 'max-[650px]:p-3' : 'grid-cols-2 min-[651px]:grid-cols-1')}>
                <Link className={cn(SECONDARY_BUTTON, 'px-3 text-sm', columns === 2 && 'max-[650px]:px-2 max-[650px]:text-[13px]')} href={href}>
                    {t('catalogue.viewDesign')}
                </Link>
                <a className={cn(PRIMARY_BUTTON, 'px-3 text-sm', columns === 2 && 'max-[650px]:px-2 max-[650px]:text-[13px]')} href={routes.saveMyDateEditorStart(theme.slug)}>
                    {t('catalogue.tryFree')}
                </a>
            </div>
        </article>
    );
}
