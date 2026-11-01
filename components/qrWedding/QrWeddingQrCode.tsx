'use client';

import { QRCodeSVG } from 'qrcode.react';

import { QR_WEDDING_UPLOAD_HREF } from '@/lib/qrWeddingPage';
import { absoluteUrl } from '@/lib/seo';

const LOGO = '/assets/Logo.svg';

// The sample QR code: it opens the demo wedding's upload page, with the logo in the middle.
export function QrWeddingQrCode({ label, size, className }: { label: string; size: number; className?: string }) {
    const logo = Math.round(size / 6);

    return (
        <QRCodeSVG
            className={className}
            fgColor="#000000"
            imageSettings={{ src: LOGO, height: logo, width: logo, excavate: true }}
            level="H"
            marginSize={0}
            role="img"
            size={size}
            title={label}
            value={absoluteUrl(QR_WEDDING_UPLOAD_HREF)}
        />
    );
}
