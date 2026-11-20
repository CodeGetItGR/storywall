import { ChevronRight, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

type QrLinksSectionProps = {
    eventId: string;
    showInvitations: boolean;
    invitationsQrCount: number;
};

/**
 * A compact pointer to the share links page, where the event's one code lives: it opens a page for
 * joining or uploading photos (KAN-208).
 */
export function QrLinksSection({ eventId, showInvitations, invitationsQrCount }: QrLinksSectionProps) {
    const t = useTranslations('RightContextPanel.qrLinks');

    if (!showInvitations) return null;

    return (
        <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t('title')}</p>
            <div className="space-y-1.5">
                <AppLink
                    href={routes.events.invitationsQr(eventId)}
                    className="group flex items-center gap-2 rounded-md bg-surface-muted/70 px-3 py-2.5"
                >
                    <QrCode className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                        {invitationsQrCount > 0 ? t('invitations.body', { count: invitationsQrCount }) : t('invitations.missing')}
                    </p>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted" aria-hidden="true" />
                </AppLink>
            </div>
        </div>
    );
}
