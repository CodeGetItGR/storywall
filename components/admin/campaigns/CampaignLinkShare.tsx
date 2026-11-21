'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { CampaignLinkCopyButton } from '@/components/admin/campaigns/CampaignLinkCopyButton';
import { useCampaignLinkShare } from '@/hooks/useCampaignLinkShare';

interface CampaignLinkShareProps {
    shortUrl: string;
    fullUrl: string;
    // The address the QR code carries: the one the link list copies.
    qrUrl: string;
    fileName: string;
}

// Both addresses of a link, each with its own copy button, and a QR code for print.
export function CampaignLinkShare({ shortUrl, fullUrl, qrUrl, fileName }: CampaignLinkShareProps) {
    const t = useTranslations('AdminPage.campaigns.share');
    const share = useCampaignLinkShare(qrUrl, fileName);
    const addresses = [
        { label: t('shortLink'), url: shortUrl },
        { label: t('fullLink'), url: fullUrl },
    ];

    return (
        <div data-campaign-share className="space-y-3 rounded-lg bg-canvas p-3">
            {/* Links */}
            <dl className="space-y-2.5">
                {addresses.map((address) => (
                    <div key={address.label} className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <dt className="text-xs font-semibold text-ink-muted">{address.label}</dt>
                            <dd className="font-mono text-xs leading-5 break-all text-ink">{address.url}</dd>
                        </div>
                        <CampaignLinkCopyButton url={address.url} label={address.label} />
                    </div>
                ))}
            </dl>

            {/* QR code */}
            <div className="flex flex-wrap items-end gap-3">
                <div className="inline-block rounded-md bg-white p-2">
                    <QRCodeSVG value={qrUrl} size={128} marginSize={1} aria-label={t('qr')} />
                </div>
                <button
                    type="button"
                    onClick={share.handleDownloadQrClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-semibold text-ink-muted"
                >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('downloadQr')}
                </button>
            </div>
        </div>
    );
}
