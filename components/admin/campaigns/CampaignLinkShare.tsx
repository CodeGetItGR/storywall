'use client';

import { Check, Copy, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';

// The address to share, with copy and a QR code for print.
export function CampaignLinkShare({ url, fileName }: { url: string; fileName: string }) {
    const t = useTranslations('AdminPage.campaigns.share');
    const share = useCampaignLinkShare(url, fileName);

    return (
        <div data-campaign-share className="space-y-3 rounded-lg bg-canvas p-3">
            {/* Link */}
            <p className="font-mono text-xs leading-5 break-all text-ink">{url}</p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={share.handleCopyClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    {share.copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                    {share.copied ? t('copied') : t('copy')}
                </button>
                <button
                    type="button"
                    onClick={share.handleDownloadQrClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-semibold text-ink-muted"
                >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('downloadQr')}
                </button>
            </div>

            {/* QR code */}
            <div className="inline-block rounded-md bg-white p-2">
                <QRCodeSVG value={url} size={128} marginSize={1} aria-label={t('qr')} />
            </div>
        </div>
    );
}
