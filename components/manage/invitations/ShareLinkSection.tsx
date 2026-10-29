'use client';

import { Copy, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { QrLinkResponseDto } from '@/lib/api/types';

const ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink';

const PRIMARY_ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90';

// Copy and share for the link, with a one-line note on what it's for.
export function ShareLinkSection({ qrLink }: { qrLink: QrLinkResponseDto }) {
    const t = useTranslations('ManagePage');
    const tGlobal = useTranslations();
    const shareLink = useShareLink(qrLink.publicUrl);
    const { copied, copy } = useCopyText(shareLink);
    const { canShare, share } = useNativeShare(shareLink, qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || undefined);

    return (
        <section aria-labelledby={`share-link-${qrLink.id}`}>
            {/* Header */}
            <h2 id={`share-link-${qrLink.id}`} className="mb-1 text-sm font-semibold text-ink">
                {t('qr.sections.link')}
            </h2>

            {/* Note */}
            <p className="text-xs leading-relaxed text-ink-muted">{t('qr.sections.linkNote')}</p>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className={canShare ? ACTION_CLASS : PRIMARY_ACTION_CLASS}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? t('invitations.copied') : t('invitations.copyLink')}
                </button>
                {canShare && (
                    <button type="button" onClick={share} className={PRIMARY_ACTION_CLASS}>
                        <Share2 className="h-3.5 w-3.5" />
                        {t('qr.share')}
                    </button>
                )}
            </div>
        </section>
    );
}
