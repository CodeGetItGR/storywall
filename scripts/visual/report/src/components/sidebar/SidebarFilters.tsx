import type { ChangeEvent } from 'react';

import type { CaptureState } from '../../../../types';
import { copy } from '../../copy';
import { SEARCH_INPUT_ID } from '../../hooks/useKeyboardShortcuts';
import type { ReportView } from '../../hooks/useReportView';
import { type ReportModel, STATES } from '../../lib/model';
import type { ListMode } from '../../lib/reviewOrder';
import { Segment } from '../Segment';

const MODE_OPTIONS: { value: ListMode; label: string }[] = [
    { value: 'area', label: copy.byArea },
    { value: 'change', label: copy.sameChange },
];

type StateChipProps = { state: CaptureState; count: number; pressed: boolean; onToggle: (state: CaptureState) => void };

function StateChip({ state, count, pressed, onToggle }: StateChipProps) {
    function handleClick() {
        onToggle(state);
    }
    return (
        <button type="button" className={`chip s-${state}`} disabled={count === 0} aria-pressed={pressed} onClick={handleClick}>
            <span className="dot" />
            {copy.states[state]}
            <b>{count}</b>
        </button>
    );
}

type SidebarFiltersProps = { model: ReportModel; view: ReportView };

export function SidebarFilters({ model, view }: SidebarFiltersProps) {
    function handleSearch(event: ChangeEvent<HTMLInputElement>) {
        view.setSearch(event.target.value);
    }
    function handleHideReviewed(event: ChangeEvent<HTMLInputElement>) {
        view.setHideReviewed(event.target.checked);
    }
    return (
        <>
            {/* State filters */}
            <div className="chips" role="group" aria-label={copy.filterByState}>
                {STATES.map((state) => (
                    <StateChip
                        key={state}
                        state={state}
                        count={model.manifest.counts[state]}
                        pressed={view.states.has(state)}
                        onToggle={view.toggleState}
                    />
                ))}
            </div>

            {/* Search */}
            <label className="search">
                <input
                    id={SEARCH_INPUT_ID}
                    type="text"
                    placeholder={copy.findStory}
                    aria-label={copy.findStory}
                    autoComplete="off"
                    aria-keyshortcuts="/"
                    value={view.search}
                    onChange={handleSearch}
                />
                <kbd className="keys" aria-hidden="true">
                    /
                </kbd>
            </label>

            {/* List tools */}
            <div className="side-tools">
                {view.hasGroups && <Segment label={copy.organizeList} options={MODE_OPTIONS} value={view.mode} onPick={view.setMode} />}
                <label className="check">
                    <input type="checkbox" checked={view.hideReviewed} onChange={handleHideReviewed} />
                    {copy.hideReviewed}
                </label>
            </div>
        </>
    );
}
