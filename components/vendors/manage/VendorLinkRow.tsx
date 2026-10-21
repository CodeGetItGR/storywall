'use client';

import { Copy, QrCode, RotateCcw, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { PartnerRole, VendorLinkDto } from '@/lib/api/types';
import { vendorInviteUrl } from '@/lib/vendors';

const ACTION_CLASS =
    'flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink';

export function VendorLinkRow({
    link,
    onQrAction,
    onResetAction,
}: {
    link: VendorLinkDto;
    onQrAction: (type: PartnerRole) => void;
    onResetAction: (type: PartnerRole) => void;
}) {
    const t = useTranslations('Vendors');
    const typeLabel = t(`types.${link.vendorType}`);
    // Copied and shared links carry the host's language, like the event's share links.
    const shareUrl = useShareLink(vendorInviteUrl(link.inviteToken));
    const { copied, copy } = useCopyText(shareUrl);
    const { canShare, share } = useNativeShare(shareUrl, typeLabel);
    const handleQr = useCallback(() => onQrAction(link.vendorType), [link.vendorType, onQrAction]);
    const handleReset = useCallback(() => onResetAction(link.vendorType), [link.vendorType, onResetAction]);

    return (
        <li className="flex flex-col gap-2 py-3 first:pt-0">
            {/* Type */}
            <p className="text-sm leading-5 font-semibold text-ink">{typeLabel}</p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={copy} className={ACTION_CLASS}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copied ? t('manage.copied') : t('manage.copy')}
                </button>
                {canShare && (
                    <button type="button" onClick={share} className={ACTION_CLASS}>
                        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('manage.share')}
                    </button>
                )}
                <button type="button" onClick={handleQr} className={ACTION_CLASS}>
                    <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('manage.qr')}
                </button>
                <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('manage.reset')}
                </button>
            </div>
        </li>
    );
}
