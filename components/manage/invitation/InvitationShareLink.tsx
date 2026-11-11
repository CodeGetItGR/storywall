'use client';

import { Copy, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';

const ACTION_CLASS =
    'flex min-h-10 min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink-muted transition-colors hover:text-ink';
const PRIMARY_ACTION_CLASS =
    'flex min-h-10 min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90';

// The published invitation's link: copy, share, and its QR code.
export function InvitationShareLink({ url }: { url: string }) {
    const t = useTranslations('ManagePage');
    const { copied, copy } = useCopyText(url);
    const { canShare, share } = useNativeShare(url);

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* QR code */}
            <div className="flex justify-center rounded-2xl bg-white p-4 sm:order-2">
                <QRCodeSVG
                    value={url}
                    size={160}
                    level="M"
                    marginSize={2}
                    fgColor="#241f1a"
                    bgColor="#ffffff"
                    role="img"
                    aria-label={t('invitation.qrAlt')}
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
                {/* Link */}
                <p className="font-mono text-sm break-all text-ink">{url}</p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={copy} className={canShare ? ACTION_CLASS : PRIMARY_ACTION_CLASS}>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        {copied ? t('invitations.copied') : t('invitations.copyLink')}
                    </button>
                    {canShare && (
                        <button type="button" onClick={share} className={PRIMARY_ACTION_CLASS}>
                            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('qr.share')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
