import { ChevronRight, Images, QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import type { QrLinkResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

type QrLinksSectionProps = {
    eventId: string;
    showGallery: boolean;
    galleryQrLink: QrLinkResponseDto | null;
    showInvitations: boolean;
    invitationsQrCount: number;
};

/**
 * Compact pointers to the two dedicated QR management pages — gallery
 * uploads and share/join links — grouped under one heading instead of two,
 * so hosts get a single "Links" entry point rather than duplicate headers.
 */
export function QrLinksSection({ eventId, showGallery, galleryQrLink, showInvitations, invitationsQrCount }: QrLinksSectionProps) {
    const t = useTranslations('RightContextPanel.qrLinks');

    if (!showGallery && !showInvitations) return null;

    return (
        <div>
            <p className="mb-2 text-sm font-semibold text-ink">{t('title')}</p>
            <div className="space-y-1.5">
                {showGallery && (
                    <AppLink
                        href={routes.events.tools.galleryQr(eventId)}
                        className="group flex items-center gap-2 rounded-md bg-surface-muted/70 px-3 py-2.5"
                    >
                        <Images className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">{galleryQrLink ? t('gallery.body') : t('gallery.missing')}</p>
                        <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted"
                            aria-hidden="true"
                        />
                    </AppLink>
                )}
                {showInvitations && (
                    <AppLink
                        href={routes.events.invitationsQr(eventId)}
                        className="group flex items-center gap-2 rounded-md bg-surface-muted/70 px-3 py-2.5"
                    >
                        <QrCode className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <p className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                            {invitationsQrCount > 0 ? t('invitations.body', { count: invitationsQrCount }) : t('invitations.missing')}
                        </p>
                        <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-ink-muted"
                            aria-hidden="true"
                        />
                    </AppLink>
                )}
            </div>
        </div>
    );
}
