'use client';

import { Copy, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { QrLinkResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { ShareLanguageNote } from './ShareLanguageNote';

// Print card is the page's one main action (under the code), so Copy and Share stay quiet.
const ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink';

// The link: a one-line note on what it's for, the link itself, copy and share, then
// whatever the page adds in `extra` (stats) and the language shared links open in.
export function ShareLinkSection({ qrLink, extra, className }: { qrLink: QrLinkResponseDto; extra?: ReactNode; className?: string }) {
    const t = useTranslations('ManagePage');
    const tGlobal = useTranslations();
    const shareLink = useShareLink(qrLink.publicUrl);
    const { copied, copy } = useCopyText(shareLink);
    const { canShare, share } = useNativeShare(shareLink, qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || undefined);

    return (
        <section aria-labelledby={`share-link-${qrLink.id}`} className={cn('flex flex-col gap-3', className)}>
            {/* Header */}
            <h2 id={`share-link-${qrLink.id}`} className="text-[17px] font-bold text-ink">
                {t('qr.sections.link')}
            </h2>

            {/* Note */}
            <p className="text-[13px] leading-relaxed text-ink-muted">{t('qr.sections.linkNote')}</p>

            {/* Link */}
            <p className="font-mono text-[13px] break-all text-ink">{shareLink}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copy} className={ACTION_CLASS}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? t('invitations.copied') : t('invitations.copyLink')}
                </button>
                {canShare && (
                    <button type="button" onClick={share} className={ACTION_CLASS}>
                        <Share2 className="h-3.5 w-3.5" />
                        {t('qr.share')}
                    </button>
                )}
            </div>

            {/* Extra actions */}
            {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}

            {/* Link language */}
            <ShareLanguageNote />
        </section>
    );
}
