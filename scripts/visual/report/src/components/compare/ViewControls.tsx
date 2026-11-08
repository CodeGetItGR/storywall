import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { canCompare, canZoom, type CompareMode, type ZoomMode } from '../../lib/viewState';
import { Segment } from '../Segment';

const COMPARE_OPTIONS: { value: CompareMode; label: string }[] = [
    { value: 'side', label: copy.sideBySide },
    { value: 'slider', label: copy.slider },
    { value: 'diff', label: copy.diff },
];

const ZOOM_OPTIONS: { value: ZoomMode; label: string }[] = [
    { value: 'fit', label: copy.fit },
    { value: 'full', label: copy.fullSize },
];

type ViewControlsProps = {
    entry: ReportEntry;
    compare: CompareMode;
    zoom: ZoomMode;
    onCompare: (mode: CompareMode) => void;
    onZoom: (mode: ZoomMode) => void;
};

// The same rules as the keyboard shortcuts, so a key never does what a disabled control can't.
// A control that's off shows nothing pressed, so it never disagrees with the screen.
export function ViewControls({ entry, compare, zoom, onCompare, onZoom }: ViewControlsProps) {
    const comparable = canCompare(entry);
    const zoomable = canZoom(entry, compare);
    return (
        <>
            <Segment label={copy.compare} options={COMPARE_OPTIONS} value={comparable ? compare : null} disabled={!comparable} onPick={onCompare} />
            <Segment label={copy.zoom} options={ZOOM_OPTIONS} value={zoomable ? zoom : null} disabled={!zoomable} onPick={onZoom} />
        </>
    );
}
