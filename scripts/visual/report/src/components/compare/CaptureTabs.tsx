import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { CAPTURE_ORDER, type CaptureChoice } from '../../lib/captures';
import { captureLabel, entryValue } from '../../lib/labels';
import { findCapture, type Story } from '../../lib/model';

type CaptureTabProps = { choice: CaptureChoice; story: Story; current: ReportEntry; onPick: (choice: CaptureChoice) => void };

function CaptureTab({ choice, story, current, onPick }: CaptureTabProps) {
    const match = findCapture(story, choice);
    function handleClick() {
        onPick(choice);
    }
    return (
        <button type="button" className="tab" disabled={!match} aria-pressed={match?.id === current.id} onClick={handleClick}>
            {captureLabel(choice)}
            <span className="value">{match ? entryValue(match) : copy.noChange}</span>
        </button>
    );
}

type CaptureTabsProps = { story: Story; current: ReportEntry; onPick: (choice: CaptureChoice) => void };

export function CaptureTabs({ story, current, onPick }: CaptureTabsProps) {
    return (
        <div className="tabs" role="group" aria-label={copy.languageAndWidth}>
            {CAPTURE_ORDER.map((choice) => (
                <CaptureTab key={captureLabel(choice)} choice={choice} story={story} current={current} onPick={onPick} />
            ))}
        </div>
    );
}
