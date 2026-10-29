import type { EventThemeFontDto, QrCardSize } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';
import { QR_CARD_SIZES } from '@/lib/qrCard';

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

async function inlineImages(svg: SVGSVGElement): Promise<void> {
    await Promise.all(
        [...svg.querySelectorAll('image')].map(async (image) => {
            const href = image.getAttribute('href');
            if (href && !href.startsWith('data:')) image.setAttribute('href', await toDataUri(href));
        }),
    );
}

// A copy of a plain QR code with its centre logo inline, so a saved file or print window shows it.
export async function selfContainedQrSvg(svg: SVGSVGElement): Promise<string> {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    await inlineImages(copy);
    return new XMLSerializer().serializeToString(copy);
}

// A copy of the card as a self-contained SVG file at the size's export pixels: images and the title
// font inline, no page classes. The card on the page stays as it is.
export async function standaloneQrCardSvg(svg: SVGSVGElement, font: EventThemeFontDto | null, size: QrCardSize): Promise<string> {
    const { widthPx, heightPx } = QR_CARD_SIZES[size];
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(widthPx));
    copy.setAttribute('height', String(heightPx));
    copy.removeAttribute('class');
    const css = themeFontFaceCss(font);
    const [fontUri] = await Promise.all([css && font ? toDataUri(font.url) : null, inlineImages(copy)]);
    if (css && font && fontUri) {
        const style = document.createElementNS(SVG_NS, 'style');
        style.textContent = css.replace(font.url, fontUri);
        copy.insertBefore(style, copy.firstChild);
    }
    return new XMLSerializer().serializeToString(copy);
}

// The standalone SVG drawn on a 300 dpi canvas at the paper size.
export async function qrCardPng(markup: string, size: QrCardSize): Promise<Blob> {
    const { widthPx, heightPx } = QR_CARD_SIZES[size];
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2D canvas');
        context.drawImage(image, 0, 0, widthPx, heightPx);
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}

// One page of the paper size with the PNG edge to edge. pdf-lib loads only when a host saves a PDF.
export async function qrCardPdfBytes(png: ArrayBuffer, size: QrCardSize): Promise<Uint8Array> {
    const { widthPt, heightPt } = QR_CARD_SIZES[size];
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([widthPt, heightPt]);
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
    return pdf.save();
}
