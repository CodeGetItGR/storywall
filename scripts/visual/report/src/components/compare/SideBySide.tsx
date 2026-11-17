import type { ReportEntry } from '../../../../types';
import { useSyncedScroll } from '../../hooks/useSyncedScroll';
import { CaptureFigure } from './CaptureFigure';

export function SideBySide({ entry }: { entry: ReportEntry }) {
    const { firstRef, secondRef, handleFirstScroll, handleSecondScroll } = useSyncedScroll();
    return (
        <div className="compare">
            <CaptureFigure entry={entry} kind="before" frameRef={firstRef} onFrameScroll={handleFirstScroll} />
            <CaptureFigure entry={entry} kind="after" frameRef={secondRef} onFrameScroll={handleSecondScroll} />
        </div>
    );
}
