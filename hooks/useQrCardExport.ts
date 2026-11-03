'use client';

import * as Sentry from '@sentry/nextjs';
import { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';

import type { EventThemeFontDto, QrCardSize } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { qrCardFileName, type QrCardPerPage, qrCardSheet } from '@/lib/qrCard';
import { qrCardPdfBytes, qrCardPng, standaloneQrCardSvg } from '@/lib/qrCardExport';

export type QrCardExportFormat = 'png' | 'pdf';

// Print, Save PNG and Save PDF for the card SVG behind svgRef, at the chosen paper size. One save runs at a time.
// Print and PDF can fill an A4 sheet with copies of the card instead; the PNG is always one card.
export function useQrCardExport({ font, title, size }: { font: EventThemeFontDto | null; title: string; size: QrCardSize }) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    // Set synchronously: a fast double click starts two saves before busy re-renders.
    const running = useRef(false);
    const [busy, setBusy] = useState<QrCardExportFormat | null>(null);
    const [failed, setFailed] = useState(false);
    const [perPage, setPerPage] = useState<QrCardPerPage>('one');
    const fullSheet = useMemo(() => qrCardSheet(size), [size]);
    const sheet = perPage === 'sheet' ? fullSheet : null;

    const save = useCallback(
        async (format: QrCardExportFormat) => {
            const svg = svgRef.current;
            if (!svg || running.current) return;
            running.current = true;
            setBusy(format);
            setFailed(false);
            try {
                const png = await qrCardPng(await standaloneQrCardSvg(svg, font, size), size);
                const file =
                    format === 'png'
                        ? png
                        : new Blob([new Uint8Array(await qrCardPdfBytes(await png.arrayBuffer(), size, sheet))], { type: 'application/pdf' });
                downloadBlob(file, qrCardFileName(title, format));
            } catch (error) {
                Sentry.captureException(error);
                setFailed(true);
            } finally {
                running.current = false;
                setBusy(null);
            }
        },
        [font, sheet, size, title],
    );

    const handlePerPageChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => setPerPage(event.target.value === 'sheet' ? 'sheet' : 'one'),
        [],
    );
    const print = useCallback(() => window.print(), []);
    const savePng = useCallback(() => void save('png'), [save]);
    const savePdf = useCallback(() => void save('pdf'), [save]);

    return { svgRef, busy, failed, perPage, sheet, sheetCount: fullSheet.cards.length, handlePerPageChange, print, savePng, savePdf };
}

export type QrCardExportState = ReturnType<typeof useQrCardExport>;
