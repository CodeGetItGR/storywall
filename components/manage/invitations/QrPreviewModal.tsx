'use client';

import { Download, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';

import { Modal } from '@/components/ui/modal';
import type { QrLinkResponseDto } from '@/lib/api/types';

export function QrPreviewModal({
    qrLink,
    open,
    onClose,
}: {
    qrLink: QrLinkResponseDto;
    open: boolean;
    onClose: () => void;
}) {
    const t = useTranslations('ManagePage');
    const svgRef = useRef<SVGSVGElement | null>(null);

    function handleDownloadSvg() {
        const svg = svgRef.current;
        if (!svg) return;

        const serialized = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qrLink.label || qrLink.token}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function handlePrint() {
        const svg = svgRef.current;
        if (!svg) return;

        const popup = window.open('', '_blank', 'width=640,height=800');
        if (!popup) return;

        const serialized = new XMLSerializer().serializeToString(svg);
        popup.document.write(`
            <html>
              <head>
                <title>${qrLink.label || 'Storywall QR'}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; text-align: center; color: #241f1a; }
                  .label { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                  .hint { font-size: 14px; margin-bottom: 24px; }
                  svg { width: 320px; height: 320px; }
                  .url { margin-top: 24px; font-size: 11px; word-break: break-all; color: #6f665d; }
                </style>
              </head>
              <body>
                <div class="label">${qrLink.label || 'Storywall'}</div>
                <div class="hint">Scan to open Storywall</div>
                ${serialized}
                <div class="url">${qrLink.publicUrl}</div>
              </body>
            </html>
        `);
        popup.document.close();
        popup.focus();
        popup.print();
    }

    return (
        <Modal open={open} onClose={onClose} closeLabel={t('invitations.create.cancel')} size="sm">
            <Modal.Body className="p-6">
                <div className="pr-8">
                    <p className="text-lg font-bold text-ink">{qrLink.label || t('qr.untitled')}</p>
                    <p className="mt-1 text-xs text-ink-muted">{t(`qr.targetTypes.${qrLink.targetType}`)}</p>
                </div>

                <div className="my-6 flex justify-center rounded-2xl bg-white p-5">
                    <QRCodeSVG
                        ref={svgRef}
                        value={qrLink.publicUrl}
                        size={240}
                        level="H"
                        marginSize={4}
                        fgColor="#241f1a"
                        bgColor="#ffffff"
                        title={qrLink.label || t('qr.untitled')}
                        imageSettings={{ src: '/assets/Logo.svg', height: 40, width: 40, excavate: true }}
                    />
                </div>

                <p className="mb-4 break-all rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted">{qrLink.publicUrl}</p>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="flex items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t('qr.downloadSvg')}
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-3 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.print')}
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
