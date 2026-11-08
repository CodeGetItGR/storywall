import type { ReportEntry } from '../../../../types';
import type { CompareMode } from '../../lib/viewState';
import { FailedNotice } from './FailedNotice';
import { SideBySide } from './SideBySide';
import { SingleImage } from './SingleImage';
import { SliderView } from './SliderView';

type CompareViewProps = { entry: ReportEntry; compare: CompareMode; slider: number; onSlider: (position: number) => void };

export function CompareView({ entry, compare, slider, onSlider }: CompareViewProps) {
    if (entry.state === 'failed') return <FailedNotice error={entry.error} />;
    if (entry.state === 'new') return <SingleImage entry={entry} kind="after" />;
    if (entry.state === 'removed') return <SingleImage entry={entry} kind="before" />;
    if (compare === 'slider') return <SliderView entry={entry} position={slider} onMove={onSlider} />;
    if (compare === 'diff') return <SingleImage entry={entry} kind="diff" />;
    return <SideBySide entry={entry} />;
}
