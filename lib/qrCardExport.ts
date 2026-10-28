import type { EventThemeFontDto } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';
import { QR_CARD_EXPORT_HEIGHT, QR_CARD_EXPORT_WIDTH, QR_CARD_PDF_HEIGHT, QR_CARD_PDF_WIDTH } from '@/lib/qrCard';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHUNK = 0x8000;

// A same-origin file as a data: URI. An SVG drawn through an <img> loads nothing on its own, so
// every image and font the card uses goes inline.
export async function toDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status})`);
    const type = response.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
    const data = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < data.length; index += CHUNK) {
        binary += String.fromCharCode(...data.subarray(index, index + CHUNK));
    }
    return `data:${type};base64,${btoa(binary)}`;
}

// A copy of the card as a self-contained SVG file at export size: images and the title font inline,
// no page classes. The card on the page stays as it is.
export async function standaloneQrCardSvg(svg: SVGSVGElement, font: EventThemeFontDto | null): Promise<string> {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(QR_CARD_EXPORT_WIDTH));
    copy.setAttribute('height', String(QR_CARD_EXPORT_HEIGHT));
    copy.removeAttribute('class');
    await Promise.all(
        [...copy.querySelectorAll('image')].map(async (image) => {
            const href = image.getAttribute('href');
            if (href && !href.startsWith('data:')) image.setAttribute('href', await toDataUri(href));
        }),
    );
    const css = themeFontFaceCss(font);
    if (css && font) {
        const style = document.createElementNS(SVG_NS, 'style');
        style.textContent = css.replace(font.url, await toDataUri(font.url));
        copy.insertBefore(style, copy.firstChild);
    }
    return new XMLSerializer().serializeToString(copy);
}

// The standalone SVG drawn on a 300 dpi A6 canvas.
export async function qrCardPng(markup: string): Promise<Blob> {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = QR_CARD_EXPORT_WIDTH;
        canvas.height = QR_CARD_EXPORT_HEIGHT;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2D canvas');
        context.drawImage(image, 0, 0, QR_CARD_EXPORT_WIDTH, QR_CARD_EXPORT_HEIGHT);
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}

// One A6 page with the PNG edge to edge. pdf-lib loads only when a host saves a PDF.
export async function qrCardPdfBytes(png: ArrayBuffer): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([QR_CARD_PDF_WIDTH, QR_CARD_PDF_HEIGHT]);
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 0, y: 0, width: QR_CARD_PDF_WIDTH, height: QR_CARD_PDF_HEIGHT });
    return pdf.save();
}

export function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    // Some browsers start the download only after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
