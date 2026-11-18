import { clsx } from 'clsx';

import { copy } from '../../copy';
import type { ReportView } from '../../hooks/useReportView';
import { percentText } from '../../lib/labels';
import type { Marks } from '../../lib/marks';
import { type Group, largestPercent, type Story, worstState } from '../../lib/model';
import { allReviewed, type Item, OVERVIEW, sameItem } from '../../lib/reviewOrder';
import { Swatches } from '../Swatches';

const currentFlag = (view: ReportView, item: Item) => (sameItem(view.item, item) ? 'true' : undefined);

// The role makes screen readers read the label. A label on a plain span isn't always read.
function Tick({ done }: { done: boolean }) {
    if (!done) return <span className="tick" />;
    return (
        <span className="tick" role="img" aria-label={copy.reviewed}>
            ✓
        </span>
    );
}

export function OverviewRow({ view }: { view: ReportView }) {
    function handleClick() {
        view.go(OVERVIEW);
    }
    return (
        <button type="button" className="row row-area row-overview" aria-current={currentFlag(view, OVERVIEW)} onClick={handleClick}>
            <span className="name">{copy.overview}</span>
        </button>
    );
}

type StoryRowProps = { story: Story; label: string; nested: boolean; view: ReportView; marks: Marks };

export function StoryRow({ story, label, nested, view, marks }: StoryRowProps) {
    const state = worstState(story.entries);
    const item: Item = { kind: 'story', id: story.id };
    const done = allReviewed(story.entries, marks);
    const percent = largestPercent(story);
    function handleClick() {
        view.go(item);
    }
    return (
        <button
            type="button"
            className={clsx('row', nested && 'row-story', done && 'is-done')}
            aria-current={currentFlag(view, item)}
            onClick={handleClick}
        >
            {/* The dot's color is the only sign of the state, so screen readers get the word. */}
            <span className={`dot s-${state}`} role="img" aria-label={copy.states[state]} />
            <span className="name" title={label}>
                {label}
            </span>
            {percent !== null && <span className="value">{percentText(percent)}</span>}
            <Tick done={done} />
        </button>
    );
}

type ToggleRowProps = { rowKey: string; nameId: string; label: string; count: number; className: string; view: ReportView };

// While searching every row is open, so a click does nothing until the search is cleared.
export function ToggleRow({ rowKey, nameId, label, count, className, view }: ToggleRowProps) {
    function handleClick() {
        view.toggleRow(rowKey);
    }
    return (
        <button
            type="button"
            className={`row ${className}`}
            aria-expanded={view.isRowOpen(rowKey)}
            aria-disabled={view.searching}
            onClick={handleClick}
        >
            <span className="caret" aria-hidden="true">
                ›
            </span>
            <span className="name" id={nameId}>
                {label}
            </span>
            <span className="value">{count}</span>
        </button>
    );
}

type GroupRowProps = { group: Group; view: ReportView; marks: Marks };

export function GroupRow({ group, view, marks }: GroupRowProps) {
    const item: Item = { kind: 'group', key: group.key };
    const done = allReviewed(group.entries, marks);
    function handleClick() {
        view.go(item);
    }
    return (
        <button type="button" className={clsx('row', done && 'is-done')} aria-current={currentFlag(view, item)} onClick={handleClick}>
            <Swatches from={group.from} to={group.to} />
            <span className="name" title={group.label}>
                {group.label}
            </span>
            <span className="value">{group.entries.length}</span>
            <Tick done={done} />
        </button>
    );
}
