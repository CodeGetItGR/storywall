import { useId } from 'react';

import type { QrCardLogo as QrCardLogoBox } from '@/lib/qrCardLayout';
import {
    QR_CARD_LOGO_BOX,
    QR_CARD_LOGO_BUBBLE,
    QR_CARD_LOGO_BUBBLE_GRADIENT,
    QR_CARD_LOGO_INK,
    QR_CARD_LOGO_SPARKLE,
    QR_CARD_LOGO_STAR,
    QR_CARD_LOGO_STAR_GRADIENT,
    QR_CARD_LOGO_WORDMARK,
    QR_CARD_LOGO_WORDMARK_PATHS,
} from '@/lib/qrCardLogoArt';

type Gradient = typeof QR_CARD_LOGO_BUBBLE_GRADIENT;

function LinearGradient({ id, gradient }: { id: string; gradient: Gradient }) {
    return (
        <linearGradient id={id} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2} gradientUnits="userSpaceOnUse">
            {gradient.stops.map((stop) => (
                <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
        </linearGradient>
    );
}

// The full logo inside a QR card's SVG, scaled into its box. Brand colours when `color` is null; otherwise all
// of it in that colour, the sparkle cut out of the bubble so the artwork shows through. Attributes only, like
// the rest of the card, so the PNG/PDF export draws it the same.
export function QrCardLogo({ logo }: { logo: QrCardLogoBox }) {
    // Gradient ids must be unique on a sheet of cards; useId's punctuation isn't safe inside url(#…).
    const id = useId().replace(/[^A-Za-z0-9_-]/g, '');
    const scale = logo.width / QR_CARD_LOGO_BOX.width;
    const { color } = logo;
    const wordmark = QR_CARD_LOGO_WORDMARK;

    return (
        <g transform={`translate(${logo.x} ${logo.y}) scale(${scale})`}>
            {/* Icon */}
            {color ? (
                <>
                    <path d={`${QR_CARD_LOGO_BUBBLE} ${QR_CARD_LOGO_SPARKLE}`} fill={color} fillRule="evenodd" />
                    <path d={QR_CARD_LOGO_STAR} fill={color} />
                </>
            ) : (
                <>
                    <defs>
                        <LinearGradient id={`${id}-bubble`} gradient={QR_CARD_LOGO_BUBBLE_GRADIENT} />
                        <LinearGradient id={`${id}-star`} gradient={QR_CARD_LOGO_STAR_GRADIENT} />
                    </defs>
                    <path d={QR_CARD_LOGO_BUBBLE} fill={`url(#${id}-bubble)`} />
                    <path d={QR_CARD_LOGO_SPARKLE} fill="#FFFFFF" />
                    <path d={QR_CARD_LOGO_STAR} fill={`url(#${id}-star)`} />
                </>
            )}
            {/* Wordmark */}
            <g transform={`translate(${wordmark.x} ${wordmark.y}) scale(${wordmark.scale})`} fill={color ?? QR_CARD_LOGO_INK}>
                {QR_CARD_LOGO_WORDMARK_PATHS.map((d) => (
                    <path key={d} d={d} />
                ))}
            </g>
        </g>
    );
}
