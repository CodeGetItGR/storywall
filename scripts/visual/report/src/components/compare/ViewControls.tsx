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
export function ViewControls({ entry, compare, zoom, onCompare, onZoom }: ViewControlsProps) {
    return (
        <>
            <Segment label={copy.compare} options={COMPARE_OPTIONS} value={compare} disabled={!canCompare(entry)} onPick={onCompare} />
            <Segment label={copy.zoom} options={ZOOM_OPTIONS} value={zoom} disabled={!canZoom(entry, compare)} onPick={onZoom} />
        </>
    );
}
