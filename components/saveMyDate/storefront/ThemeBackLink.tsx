import { ArrowLeft } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AppLink as Link } from '@/components/ui/AppLink';
import type { Locale } from '@/i18n/config';
import { getInvitationCataloguePath } from '@/i18n/publicLocale';

// Back to the catalogue in the page's language.
export function ThemeBackLink() {
    const t = useTranslations('SaveMyDateStorefront.theme');
    const locale = useLocale() as Locale;

    return (
        <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#151313]/75 focus-ring hover:text-[#151313]"
            href={getInvitationCataloguePath(locale)}
        >
            <ArrowLeft aria-hidden className="size-4" />
            {t('back')}
        </Link>
    );
}
