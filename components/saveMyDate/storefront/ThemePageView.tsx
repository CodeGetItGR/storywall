'use client';

import { useTranslations } from 'next-intl';

import { StorefrontMessage } from '@/components/saveMyDate/storefront/StorefrontMessage';
import { STOREFRONT_WRAP } from '@/components/saveMyDate/storefront/storefrontStyles';
import { ThemeBackLink } from '@/components/saveMyDate/storefront/ThemeBackLink';
import { ThemePageContent } from '@/components/saveMyDate/storefront/ThemePageContent';
import { ThemePageLoading } from '@/components/saveMyDate/storefront/ThemePageLoading';
import { useInvitationThemePage } from '@/hooks/useInvitationThemePage';

type ThemePageViewProps = { slug: string };

// One theme's page: the theme, or its loading or failed state.
export function ThemePageView({ slug }: ThemePageViewProps) {
    const t = useTranslations('SaveMyDateStorefront.theme');
    const { theme, isPending, retry } = useInvitationThemePage(slug);

    return (
        <section className="pt-4 pb-28 min-[761px]:pt-8 min-[761px]:pb-24">
            <div className={STOREFRONT_WRAP}>
                {/* Back */}
                <div className="mb-4 min-[761px]:mb-8">
                    <ThemeBackLink />
                </div>

                {theme ? <ThemePageContent theme={theme} /> : null}
                {!theme && isPending ? <ThemePageLoading /> : null}
                {!theme && !isPending ? <StorefrontMessage message={t('error')} onRetry={retry} /> : null}
            </div>
        </section>
    );
}
