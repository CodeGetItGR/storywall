'use client';

import { Copy, Download, Printer, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { useCopyText } from '@/hooks/useCopyText';
import { useNativeShare } from '@/hooks/useNativeShare';
import { useShareLink } from '@/hooks/useShareLink';
import type { QrLinkResponseDto } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { selfContainedQrSvg } from '@/lib/qrCardExport';

import { ShareLanguageNote } from './ShareLanguageNote';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// The code with its logo inline; if the logo can't load, the code alone still scans.
async function qrMarkup(svg: SVGSVGElement): Promise<string> {
    try {
        return await selfContainedQrSvg(svg);
    } catch {
        return new XMLSerializer().serializeToString(svg);
    }
}

const ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink';

// Print card when the event has designs, otherwise Share.
const PRIMARY_ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90';

// The QR artwork + copy/download/print/share actions, shared between the
// manage-page preview modal and the dedicated gallery QR page. With cardHref
// (the event has QR cards), Print opens the card page instead of the popup.
export function QrCodeCard({ qrLink, size = 240, cardHref = null }: { qrLink: QrLinkResponseDto; size?: number; cardHref?: string | null }) {
    const t = useTranslations('ManagePage');
    const tGlobal = useTranslations();
    const svgRef = useRef<SVGSVGElement | null>(null);
    // The printed code stays language-neutral; copied and shared links carry the host's language.
    const shareLink = useShareLink(qrLink.publicUrl);
    const { copied, copy: copyLink } = useCopyText(shareLink);
    const { canShare, share: handleShare } = useNativeShare(shareLink, qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || undefined);

    async function handleDownloadSvg() {
        const svg = svgRef.current;
        if (!svg) return;

        const serialized = await qrMarkup(svg);
        const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        downloadBlob(blob, `${qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || qrLink.token}.svg`);
    }

    async function handlePrint() {
        const svg = svgRef.current;
        if (!svg) return;

        // Opened before any await, so the browser still counts it as the click's own window.
        const popup = window.open('', '_blank', 'width=640,height=800');
        if (!popup) return;

        const serialized = await qrMarkup(svg);
        // The popup shares this page's origin, and the label is whatever the host
        // typed: written unescaped, markup in it would run here with their session.
        popup.document.write(`
            <html>
              <head>
                <title>${escapeHtml(qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || 'Storywall QR')}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; text-align: center; color: #241f1a; }
                  .label { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                  .hint { font-size: 14px; margin-bottom: 24px; }
                  svg { width: 320px; height: 320px; }
                  .url { margin-top: 24px; font-size: 11px; word-break: break-all; color: #6f665d; }
                </style>
              </head>
              <body>
                <div class="label">${escapeHtml(qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || 'Storywall')}</div>
                <div class="hint">Scan to open Storywall</div>
                ${serialized}
                <div class="url">${escapeHtml(qrLink.publicUrl)}</div>
              </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
    }

    return (
        <div>
            <div className="flex justify-center rounded-2xl bg-white p-5">
                <QRCodeSVG
                    ref={svgRef}
                    value={qrLink.publicUrl}
                    size={size}
                    level="H"
                    marginSize={4}
                    fgColor="#241f1a"
                    bgColor="#ffffff"
                    title={qrLink.labelKey ? tGlobal(qrLink.labelKey) : qrLink.label || t('qr.untitled')}
                    imageSettings={{ src: '/assets/Logo.svg', height: size / 6, width: size / 6, excavate: true }}
                />
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={copyLink} className={ACTION_CLASS}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? t('invitations.copied') : t('invitations.copyLink')}
                </button>
                {cardHref ? (
                    <AppLink href={cardHref} className={PRIMARY_ACTION_CLASS}>
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.printCard')}
                    </AppLink>
                ) : (
                    <button type="button" onClick={handlePrint} className={ACTION_CLASS}>
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.print')}
                    </button>
                )}
                {canShare && (
                    <button type="button" onClick={handleShare} className={cardHref ? ACTION_CLASS : PRIMARY_ACTION_CLASS}>
                        <Share2 className="h-3.5 w-3.5" />
                        {t('qr.share')}
                    </button>
                )}
            </div>

            {/* Download */}
            <div className="mt-3 flex justify-center">
                <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t('qr.downloadFile')}
                </button>
            </div>

            {/* Link language */}
            <ShareLanguageNote className="mt-3 text-center" />
        </div>
    );
}
