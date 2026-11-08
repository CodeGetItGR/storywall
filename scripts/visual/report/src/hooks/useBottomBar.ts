import { copy } from '../copy';
import type { Marks } from '../lib/marks';
import type { ReportModel } from '../lib/model';
import { barActions, itemEntries, openCount, reviewable } from '../lib/reviewOrder';
import type { ReportView } from './useReportView';

// What the bottom bar shows for the open item, so the bar itself only lays it out.
export function useBottomBar(model: ReportModel, view: ReportView, marks: Marks) {
    const { item, queue, index } = view;
    const actions = barActions(model, item, queue, marks);

    function markLabel() {
        if (actions.mark === 'undo') return copy.undoReviewed;
        if (item.kind === 'group') return copy.looksRightForAll(reviewable(itemEntries(model, item)).length);
        return copy.looksRight;
    }

    function start() {
        if (actions.start) view.go(actions.start.item);
    }

    return {
        actions,
        onOverview: item.kind === 'overview',
        // Off the list, on the Overview or an item the filters hide, it counts what's left rather than where you are.
        position: index === -1 ? copy.toReview(openCount(model, queue, marks)) : copy.position(index + 1, queue.length),
        startLabel: actions.start?.started ? copy.continueReview : copy.startReview,
        markLabel: markLabel(),
        previousDisabled: index <= 0,
        nextDisabled: queue.length === 0 || index === queue.length - 1,
        start,
    };
}
