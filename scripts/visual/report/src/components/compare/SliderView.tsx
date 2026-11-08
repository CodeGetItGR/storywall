import type { ChangeEvent, CSSProperties } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

type SliderViewProps = { entry: ReportEntry; position: number; onMove: (position: number) => void };

export function SliderView({ entry, position, onMove }: SliderViewProps) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onMove(Number(event.target.value));
    }
    return (
        <div className="slider-wrap">
            <div className="slider" style={{ '--pos': `${position}%` } as CSSProperties}>
                {/* Images */}
                <img key={entry.images.after} src={entry.images.after} alt={altText(entry, copy.after.toLowerCase())} decoding="async" />
                <img
                    key={entry.images.before}
                    className="upper"
                    src={entry.images.before}
                    alt={altText(entry, copy.before.toLowerCase())}
                    decoding="async"
                />

                {/* Divider */}
                <span className="slider-tag slider-tag-before">{copy.before}</span>
                <span className="slider-tag slider-tag-after">{copy.after}</span>
                <span className="line" />
                <input type="range" min={0} max={100} value={position} aria-label={copy.moveDivider} onChange={handleChange} />
            </div>
        </div>
    );
}
