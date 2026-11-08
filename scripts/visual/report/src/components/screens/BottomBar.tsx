import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import type { Marks } from '../../lib/marks';
import type { ReportModel } from '../../lib/model';
import { barActions, itemEntries, reviewable } from '../../lib/reviewOrder';

type BottomBarProps = { model: ReportModel; view: ReportView; marks: Marks };

export function BottomBar({ model, view, marks }: BottomBarProps) {
    const { item, queue, index } = view;
    const onOverview = item.kind === 'overview';
    const actions = barActions(model, item, queue, marks);
    const markCount = reviewable(itemEntries(model, item)).length;
    const looksRight = item.kind === 'group' ? copy.looksRightForAll(markCount) : copy.looksRight;

    function handleStart() {
        if (actions.start) view.go(actions.start.item);
    }

    return (
        <footer className="bar">
            {/* Position */}
            {!onOverview && (
                <button type="button" className="btn" disabled={index <= 0} onClick={view.goPrevious}>
                    {copy.previous}
                </button>
            )}
            <span className="position">{index === -1 ? copy.toReview(queue.length) : copy.position(index + 1, queue.length)}</span>
            {!onOverview && (
                <button type="button" className="btn" disabled={queue.length === 0 || index === queue.length - 1} onClick={view.goNext}>
                    {copy.next}
                </button>
            )}
            <span className="spacer" />

            {/* Review actions */}
            {actions.start && (
                <button type="button" className="btn btn-primary" onClick={handleStart}>
                    {actions.start.started ? copy.continueReview : copy.startReview}
                </button>
            )}
            {actions.mark === 'looks-right' && (
                <button type="button" className="btn btn-primary" onClick={view.markCurrent}>
                    {looksRight}
                </button>
            )}
            {actions.mark === 'undo' && (
                <button type="button" className="btn" onClick={view.markCurrent}>
                    {copy.undoReviewed}
                </button>
            )}
            {actions.approve === 'link' && (
                <a className="btn btn-primary" href={model.manifest.pull?.url} target="_blank" rel="noreferrer">
                    {copy.approve}
                </a>
            )}
            {actions.approve === 'blocked' && <span className="position">{copy.fixFailedFirst}</span>}

            {/* Help */}
            <button type="button" className="btn help-button" aria-label={copy.shortcuts} onClick={view.openHelp}>
                ?
            </button>
        </footer>
    );
}
