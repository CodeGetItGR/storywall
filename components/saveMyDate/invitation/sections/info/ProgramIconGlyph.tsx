import type { ReactNode, SVGProps } from 'react';

import type { ProgramIconKey } from '@/lib/invitation/programIcons';

const line: SVGProps<SVGPathElement> = { stroke: 'currentColor', strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Each built-in icon's drawing, on a 64 by 64 grid.
const GLYPHS: Record<ProgramIconKey, ReactNode> = {
    church: (
        <>
            <path {...line} d="M32 7v10M27 12h10M18 28l14-12 14 12v26H18V28Z" />
            <path {...line} d="M27 54V40c0-3 2-5 5-5s5 2 5 5v14M12 54h40M22 29h20" />
            <path {...line} d="M29 26h6v6h-6z" />
        </>
    ),
    rings: (
        <>
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="25" cy="36" r="14" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="39" cy="29" r="14" />
            <path {...line} d="M35 11l4-6 4 6-4 5-4-5Z" />
            <path {...line} d="M30 16l9 6" />
        </>
    ),
    heart: <path {...line} d="M32 54S10 42 10 25c0-8 5-14 13-14 5 0 8 3 9 7 2-4 5-7 10-7 8 0 12 6 12 14 0 17-22 29-22 29Z" />,
    champagne: (
        <>
            <path {...line} d="M15 10h15l-2 13c-1 7-10 7-11 0l-2-13ZM34 10h15l-2 13c-1 7-10 7-11 0l-2-13ZM23 30v18M41 30v18M16 53h14M34 53h14" />
            <path {...line} d="M19 18h8M38 18h8" />
            <circle cx="31" cy="10" r="2" fill="currentColor" />
            <circle cx="33" cy="16" r="1.8" fill="currentColor" />
        </>
    ),
    cocktail: (
        <>
            <path {...line} d="M12 13h40L34 34v15M24 55h20M20 22h24" />
            <path {...line} d="M42 13l8-7" />
            <circle cx="51" cy="6" r="3" fill="currentColor" />
        </>
    ),
    dinner: (
        <>
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="32" cy="33" r="15" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="32" cy="33" r="8" />
            <path {...line} d="M10 12v18M6 12v10c0 5 8 5 8 0V12M10 30v24M54 12v42M48 12c0 10 6 14 6 14" />
        </>
    ),
    flowers: (
        <>
            <path {...line} d="M32 53V31M32 42l-10-7M32 39l10-8M20 53c3-8 9-12 12-12s9 4 12 12" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="21" cy="25" r="6" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="32" cy="20" r="7" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="43" cy="25" r="6" />
            <path {...line} d="M21 31c-6 2-10 6-12 11M43 31c6 2 10 6 12 11" />
        </>
    ),
    cake: (
        <>
            <path {...line} d="M14 36h36v18H14V36ZM19 25h26v11H19V25ZM24 17h16v8H24V17Z" />
            <path {...line} d="M28 17v-5M36 17v-5" />
            <path {...line} d="M28 10c3-2 3-5 0-7M36 10c3-2 3-5 0-7" />
            <path {...line} d="M14 44h36M19 30h26" />
        </>
    ),
    music: (
        <>
            <path {...line} d="M24 13v32M24 17l25-5v28" />
            <ellipse {...(line as SVGProps<SVGEllipseElement>)} cx="16" cy="46" rx="8" ry="6" />
            <ellipse {...(line as SVGProps<SVGEllipseElement>)} cx="41" cy="41" rx="8" ry="6" />
        </>
    ),
    dance: (
        <>
            <circle cx="23" cy="13" r="5" fill="currentColor" />
            <circle cx="41" cy="13" r="5" fill="currentColor" />
            <path {...line} d="M23 20l9 11 9-11M32 31L20 54M32 31l12 23M19 26L8 37M45 26l11 11" />
            <path {...line} d="M21 20c4 4 18 4 22 0" />
        </>
    ),
    disco: (
        <>
            <path {...line} d="M32 7v7" />
            <circle {...(line as SVGProps<SVGCircleElement>)} cx="32" cy="33" r="17" />
            <path {...line} d="M15 33h34M32 16v34M20 21c7 7 17 7 24 0M20 45c7-7 17-7 24 0M8 22l-4-3M56 22l4-3M8 45l-4 3M56 45l4 3" />
            <circle cx="9" cy="10" r="2" fill="currentColor" />
            <circle cx="55" cy="10" r="2" fill="currentColor" />
        </>
    ),
    confetti: (
        <>
            <path {...line} d="M20 30l18 12-29 14 11-26Z" />
            <path {...line} d="M37 10l3 7M51 17l-7 4M53 32l-8-2M23 9l-2 8M10 18l7 3" />
            <circle cx="50" cy="8" r="3" fill="currentColor" />
            <circle cx="12" cy="8" r="3" fill="currentColor" />
        </>
    ),
    cross: (
        <>
            <path {...line} d="M32 8v44M19 22h26" />
            <path {...line} d="M17 54h30" />
        </>
    ),
    baptism: (
        <>
            <path {...line} d="M32 6v11M27 11h10" />
            <path {...line} d="M15 30h34l-5 21H20l-5-21Z" />
            <path {...line} d="M21 30c0-7 22-7 22 0" />
            <path {...line} d="M26 38c3 4 9 4 12 0" />
            <path {...line} d="M12 20c4 1 6 4 6 8M52 20c-4 1-6 4-6 8" />
        </>
    ),
    dove: (
        <>
            <path {...line} d="M11 36c10 0 15-7 21-15 2 9 10 12 21 12-7 3-10 9-12 16-7-6-14-8-22-6-3-2-6-4-8-7Z" />
            <path {...line} d="M37 20c4-5 9-7 14-7-1 6-4 10-9 13" />
            <circle cx="45" cy="20" r="1.8" fill="currentColor" />
        </>
    ),
    balloon: (
        <>
            <ellipse {...(line as SVGProps<SVGEllipseElement>)} cx="32" cy="23" rx="13" ry="16" />
            <path {...line} d="M32 39l-4 6h8l-4-6ZM32 45c9 6-6 8 1 15" />
            <path {...line} d="M27 14c3-3 7-4 10-2" />
        </>
    ),
    cupcake: (
        <>
            <path {...line} d="M18 31h28l-5 23H23l-5-23Z" />
            <path {...line} d="M20 31c0-8 7-13 14-10 3-7 14-3 13 6 6 1 7 8 1 12" />
            <path {...line} d="M26 38l2 16M38 38l-2 16" />
        </>
    ),
    gift: (
        <>
            <path {...line} d="M11 27h42v28H11V27ZM8 18h48v9H8v-9ZM32 18v37" />
            <path {...line} d="M32 18c-8 0-14-4-14-9 0-4 4-6 7-4 4 2 7 8 7 13ZM32 18c8 0 14-4 14-9 0-4-4-6-7-4-4 2-7 8-7 13Z" />
        </>
    ),
    stars: (
        <path
            {...line}
            d="M32 7l4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11ZM49 38l2.5 6.5L58 47l-6.5 2.5L49 56l-2.5-6.5L40 47l6.5-2.5L49 38ZM14 37l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"
        />
    ),
};

export function ProgramIconGlyph({ icon }: { icon: ProgramIconKey }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            {GLYPHS[icon]}
        </svg>
    );
}
