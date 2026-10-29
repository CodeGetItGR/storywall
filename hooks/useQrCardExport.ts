'use client';

import * as Sentry from '@sentry/nextjs';
import { useCallback, useRef, useState } from 'react';

import type { EventThemeFontDto } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { qrCardFileName } from '@/lib/qrCard';
import { qrCardPdfBytes, qrCardPng, standaloneQrCardSvg } from '@/lib/qrCardExport';

export type QrCardExportFormat = 'png' | 'pdf';

// Print, Save PNG and Save PDF for the card SVG behind svgRef. One save runs at a time.
export function useQrCardExport({ font, title }: { font: EventThemeFontDto | null; title: string }) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    // Set synchronously: a fast double click starts two saves before busy re-renders.
    const running = useRef(false);
    const [busy, setBusy] = useState<QrCardExportFormat | null>(null);
    const [failed, setFailed] = useState(false);

    const save = useCallback(
        async (format: QrCardExportFormat) => {
            const svg = svgRef.current;
            if (!svg || running.current) return;
            running.current = true;
            setBusy(format);
            setFailed(false);
            try {
                const png = await qrCardPng(await standaloneQrCardSvg(svg, font));
                const file =
                    format === 'png' ? png : new Blob([new Uint8Array(await qrCardPdfBytes(await png.arrayBuffer()))], { type: 'application/pdf' });
                downloadBlob(file, qrCardFileName(title, format));
            } catch (error) {
                Sentry.captureException(error);
                setFailed(true);
            } finally {
                running.current = false;
                setBusy(null);
            }
        },
        [font, title],
    );

    const print = useCallback(() => window.print(), []);
    const savePng = useCallback(() => void save('png'), [save]);
    const savePdf = useCallback(() => void save('pdf'), [save]);

    return { svgRef, busy, failed, print, savePng, savePdf };
}

export type QrCardExportState = ReturnType<typeof useQrCardExport>;
