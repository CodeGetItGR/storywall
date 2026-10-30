import { type Ref, useId, useMemo } from 'react';

import { themeFontFamily } from '@/lib/eventTheme';
import {
    layoutLines,
    layoutTitle,
    type PlacedText,
    QR_CARD_FONT,
    QR_CARD_HEIGHT,
    QR_CARD_LOGO_SRC,
    QR_CARD_MONO_FONT,
    QR_CARD_WIDTH,
    QR_QUIET_ZONE,
    type QrCardLine,
    type QrCardLineTone,
    type QrCardStyle,
} from '@/lib/qrCard';
import { qrCodePath } from '@/lib/qrCardCode';

type TextLook = { fontFamily: string; fontWeight: number; opacity?: number; letterSpacing?: string };

const LINE_LOOKS: Record<QrCardLineTone, TextLook> = {
    body: { fontFamily: QR_CARD_FONT, fontWeight: 400 },
    strong: { fontFamily: QR_CARD_FONT, fontWeight: 700 },
    code: { fontFamily: QR_CARD_MONO_FONT, fontWeight: 700, letterSpacing: '0.2em' },
    small: { fontFamily: QR_CARD_FONT, fontWeight: 400, opacity: 0.75 },
};

function CardText({ text, fill, look }: { text: PlacedText; fill: string; look: TextLook }) {
    if (text.lines.length === 0) return null;
    return (
        <text x={text.x} textAnchor={text.anchor} fill={fill} fontSize={text.fontSize} {...look}>
            {text.lines.map((line, index) => (
                <tspan key={index} x={text.x} y={text.baselines[index]}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}

// One card in A6 millimetres: artwork (or white) full-bleed, then the title, the code (on a white panel
// unless the layout turns it off) and the lines where the layout puts them. Print and the PNG/PDF export
// reuse this exact node at A6 or A5, so it draws with attributes only (no classes inside). The whole card
// is one image to assistive tech, named by its <title>.
export function QrCardSvg({
    style,
    url,
    title,
    lines,
    label,
    className,
    ref,
}: {
    style: QrCardStyle;
    url: string;
    title: string;
    lines: QrCardLine[];
    label: string;
    className?: string;
    ref?: Ref<SVGSVGElement>;
}) {
    const titleId = useId();
    const { centerLogo, layout } = style;
    const code = useMemo(() => qrCodePath(url, { centerLogo }), [url, centerLogo]);
    const box = layout.code;
    const cell = box.size / (code.size + 2 * QR_QUIET_ZONE);
    const codeX = box.x + QR_QUIET_ZONE * cell;
    const codeY = box.y + QR_QUIET_ZONE * cell;
    const titleLook: TextLook = style.headingFont
        ? { fontFamily: themeFontFamily(style.headingFont), fontWeight: 400 }
        : { fontFamily: QR_CARD_FONT, fontWeight: 700 };

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}`}
            // A5 is a touch narrower than A6 for its height: slice trims under 1 mm from the sides
            // (inside the safe margin) instead of leaving white bands. On screen the box has the
            // card's own shape, so nothing is trimmed there.
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-labelledby={titleId}
            className={className}
        >
            <title id={titleId}>{label}</title>
            {/* Artwork */}
            {style.artworkUrl ? (
                <image href={style.artworkUrl} width={QR_CARD_WIDTH} height={QR_CARD_HEIGHT} preserveAspectRatio="xMidYMid slice" />
            ) : (
                <rect width={QR_CARD_WIDTH} height={QR_CARD_HEIGHT} fill="#FFFFFF" />
            )}
            {/* Title */}
            <CardText text={layoutTitle(title, layout.title)} fill={style.textColor} look={titleLook} />
            {/* Code */}
            {box.panel && <rect x={box.x} y={box.y} width={box.size} height={box.size} rx={box.radius} fill="#FFFFFF" />}
            <path d={code.d} transform={`translate(${codeX} ${codeY}) scale(${cell})`} fill={style.codeColor} />
            {code.logo && (
                <image
                    href={QR_CARD_LOGO_SRC}
                    x={codeX + code.logo.start * cell}
                    y={codeY + code.logo.start * cell}
                    width={code.logo.span * cell}
                    height={code.logo.span * cell}
                />
            )}
            {/* Lines */}
            {layoutLines(lines, layout.lines).map((line, index) => (
                <CardText key={index} text={line} fill={style.textColor} look={LINE_LOOKS[line.tone]} />
            ))}
        </svg>
    );
}
