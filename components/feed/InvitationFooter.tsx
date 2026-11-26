import { useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

// The small line an invitation ends with, straight on the page. The page's own bottom room keeps it off the phone's edge.
export function InvitationFooter() {
    const t = useTranslations('FeedLayout');

    return (
        <footer className="on-page flex justify-center px-4 py-6">
            <AppLink href={routes.landing} className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-ink">
                {t('madeWith')}
                <Logo className="gap-1" iconClassName="h-4 w-auto" wordmarkClassName="on-page-wordmark h-3.5 w-auto" />
            </AppLink>
        </footer>
    );
}
