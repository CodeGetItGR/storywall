import type { ReportEntry } from '../../../../types';
import { CaptureFigure, type ImageKind } from './CaptureFigure';

export function SingleImage({ entry, kind }: { entry: ReportEntry; kind: ImageKind }) {
    return (
        <div className="compare single">
            <CaptureFigure entry={entry} kind={kind} />
        </div>
    );
}
