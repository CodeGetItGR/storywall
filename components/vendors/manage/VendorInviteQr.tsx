'use client';

import { QRCodeSVG } from 'qrcode.react';

// The printed code stays language-neutral, like the event's QR links.
export function VendorInviteQr({ url, title }: { url: string; title: string }) {
    return (
        <div className="mt-2 flex justify-center rounded-2xl bg-white p-5">
            <QRCodeSVG
                value={url}
                size={220}
                level="H"
                marginSize={4}
                fgColor="#241f1a"
                bgColor="#ffffff"
                title={title}
                imageSettings={{ src: '/assets/Logo.svg', height: 40, width: 40, excavate: true }}
            />
        </div>
    );
}
