import type { CSSProperties } from 'react';

type SwatchesProps = { from?: string; to?: string };

// Colors are checked as #rrggbb before a report is published.
export function Swatches({ from, to }: SwatchesProps) {
    if (!from || !to) return null;
    const fromStyle: CSSProperties = { background: from };
    const toStyle: CSSProperties = { background: to };
    return (
        <span className="swatches" aria-hidden="true">
            <span className="swatch" style={fromStyle} />→<span className="swatch" style={toStyle} />
        </span>
    );
}
