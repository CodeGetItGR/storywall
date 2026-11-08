import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

type CaptureThumbProps = { entry: ReportEntry; title: string; value: string; current?: boolean; onPick: (entry: ReportEntry) => void };

export function CaptureThumb({ entry, title, value, current, onPick }: CaptureThumbProps) {
    function handleClick() {
        onPick(entry);
    }
    return (
        <button type="button" className="thumb" aria-current={current ? 'true' : undefined} onClick={handleClick}>
            {/* Thumbnails only show changed captures, which always have an after image. */}
            <img className="thumb-image" src={entry.images.after} alt={altText(entry, copy.after.toLowerCase())} loading="lazy" decoding="async" />
            <span>{title}</span>
            <span className="value">{value}</span>
        </button>
    );
}
