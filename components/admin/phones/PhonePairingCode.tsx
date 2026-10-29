'use client';

import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

// The one-time pairing code. The key stays inside the QR image and is never printed as text.
export function PhonePairingCode({ name, payload }: { name: string; payload: string }) {
    const t = useTranslations('AdminPage.phones');

    return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
            {/* Code */}
            <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={payload} size={224} marginSize={1} role="img" aria-label={t('qrLabel', { name })} />
            </div>

            {/* Instructions */}
            <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">{t('scan')}</p>
                <p className="text-sm text-ink-muted">{t('shownOnce')}</p>
            </div>
        </div>
    );
}
