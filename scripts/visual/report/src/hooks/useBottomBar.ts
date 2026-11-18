import { copy } from '../copy';
import type { Marks } from '../lib/marks';
import type { ReportModel } from '../lib/model';
import { barActions, itemEntries, openCount, reviewable } from '../lib/reviewOrder';
import type { ReportView } from './useReportView';

// What the bottom bar shows for the open item, so the bar itself only lays it out.
export function useBottomBar(model: ReportModel, view: ReportView, marks: Marks) {
    const { item, queue, index } = view;
    const actions = barActions(model, item, queue, marks);

    function start() {
        if (actions.start) view.go(actions.start.item);
    }

    // Start and the mark share one button, so keyboard focus stays on it as it changes.
    function action() {
        if (actions.start) return { label: actions.start.started ? copy.continueReview : copy.startReview, primary: true, run: start };
        if (actions.mark === 'undo') return { label: copy.undoReviewed, primary: false, run: view.markCurrent };
        if (actions.mark === 'looks-right') {
            const label = item.kind === 'group' ? copy.looksRightForAll(reviewable(itemEntries(model, item)).length) : copy.looksRight;
            return { label, primary: true, run: view.markCurrent };
        }
        return null;
    }

    return {
        actions,
        onOverview: item.kind === 'overview',
        // Off the list, on the Overview or an item the filters hide, it counts what's left rather than where you are.
        position: index === -1 ? copy.toReview(openCount(model, queue, marks)) : copy.position(index + 1, queue.length),
        action: action(),
        previousDisabled: index <= 0,
        nextDisabled: queue.length === 0 || index === queue.length - 1,
    };
}
