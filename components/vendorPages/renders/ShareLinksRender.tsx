import { Download, Printer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';
import { QR_WEDDING_UPLOAD_HREF } from '@/lib/qrWeddingPage';
import { absoluteUrl } from '@/lib/seo';

const FILE_ACTION = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-2 text-center text-xs font-semibold text-ink';

// A printable QR card and the print page's actions. The card is the real drawing, so it scans: it opens the demo wedding.
export async function ShareLinksRender() {
    const tCard = await getTranslations('QrCardPage');
    const t = await getTranslations('VendorPages.renders.rsvp');
    const title = t('couple');

    return (
        <div className="flex min-h-full flex-col justify-center gap-4 bg-surface-muted p-4">
            {/* Card */}
            <QrCardSvg
                className="block h-auto w-full rounded-md shadow-md"
                label={tCard('cardLabel', { title })}
                lines={[{ text: tCard('lines.gallery'), tone: 'body' }]}
                style={PLAIN_QR_CARD_STYLE}
                title={title}
                url={absoluteUrl(QR_WEDDING_UPLOAD_HREF)}
            />

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white">
                    <Printer className="h-4 w-4" />
                    {tCard('actions.print')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                    <span className={FILE_ACTION}>
                        <Download className="h-4 w-4 shrink-0" />
                        {tCard('actions.png')}
                    </span>
                    <span className={FILE_ACTION}>
                        <Download className="h-4 w-4 shrink-0" />
                        {tCard('actions.pdf')}
                    </span>
                </div>
            </div>
        </div>
    );
}
