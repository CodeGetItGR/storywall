import { useState } from 'react';

import type { CaptureState } from '../../../types';
import type { CaptureChoice } from '../lib/captures';
import type { ReportModel } from '../lib/model';
import { allReviewed, currentIndex, type Item, itemEntries, type ListMode, reviewable, reviewQueue, sameItem } from '../lib/reviewOrder';
import {
    type CompareMode,
    currentEntry,
    initialView,
    nextCapture,
    revealItem,
    stepTarget,
    toggled,
    type ViewState,
    type ZoomMode,
} from '../lib/viewState';
import type { Review } from './useReviewMarks';
import type { Route } from './useRoute';

export type ReportView = ReturnType<typeof useReportView>;

export function useReportView(model: ReportModel, route: Route, { marks, mark, unmark }: Review) {
    const { item } = route;
    const [stored, setView] = useState(() => initialView(model, item));

    // A link or the back button can change the item, so the list catches up here.
    const view = sameItem(stored.revealed, item) ? stored : revealItem(stored, model, item);
    if (view !== stored) setView(view);

    const filters = { states: view.states, search: view.search, hideReviewed: view.hideReviewed };
    const queue = reviewQueue(model, view.mode, filters, marks);
    const index = currentIndex(queue, item);
    const entry = currentEntry(model, item, view);
    const searching = view.search.trim() !== '';

    function patch(change: Partial<ViewState>) {
        setView((previous) => ({ ...previous, ...change }));
    }

    function go(target: Item) {
        patch({ drawerOpen: false });
        route.go(target);
    }

    function goInAreaList(target: Item) {
        patch({ mode: 'area' });
        go(target);
    }

    function step(delta: 1 | -1) {
        const target = stepTarget(queue, index, delta);
        if (target) go(target);
    }

    function markCurrent() {
        const entries = reviewable(itemEntries(model, item));
        if (entries.length === 0) return;
        if (allReviewed(entries, marks)) {
            unmark(entries);
            return;
        }
        // Taken from the list as it is now, because Hide reviewed drops this item once it's marked.
        const target = stepTarget(queue, index, 1);
        mark(entries);
        if (target) go(target);
    }

    function cycleCapture() {
        const story = item.kind === 'story' ? model.storyById.get(item.id) : undefined;
        if (story) patch({ capture: nextCapture(story, view.capture) });
    }

    return {
        ...view,
        item,
        filters,
        queue,
        index,
        entry,
        hasGroups: model.groups.length > 0,
        searching,
        isRowOpen: (key: string) => view.expanded.has(key) || searching,

        go,
        goInAreaList,
        goNext: () => step(1),
        goPrevious: () => step(-1),
        markCurrent,
        cycleCapture,

        setMode: (mode: ListMode) => patch({ mode }),
        toggleMode: () => patch({ mode: view.mode === 'area' ? 'change' : 'area' }),
        toggleState: (state: CaptureState) => patch({ states: toggled(view.states, state) }),
        setSearch: (search: string) => patch({ search }),
        setHideReviewed: (hideReviewed: boolean) => patch({ hideReviewed }),
        // While searching every row is open, so a click would only change what shows after the search is cleared.
        toggleRow: (key: string) => {
            if (!searching) patch({ expanded: toggled(view.expanded, key) });
        },

        setCompare: (compare: CompareMode) => patch({ compare }),
        setZoom: (zoom: ZoomMode) => patch({ zoom }),
        toggleZoom: () => patch({ zoom: view.zoom === 'fit' ? 'full' : 'fit' }),
        setSlider: (slider: number) => patch({ slider }),
        pickCapture: (capture: CaptureChoice) => patch({ capture }),
        pickGroupCapture: (key: string, id: string) => patch({ groupEntry: new Map(view.groupEntry).set(key, id) }),
        showAllThumbs: (key: string) => patch({ allThumbs: new Set(view.allThumbs).add(key) }),

        openHelp: () => patch({ helpOpen: true }),
        closeHelp: () => patch({ helpOpen: false }),
        toggleHelp: () => patch({ helpOpen: !view.helpOpen }),
        openDrawer: () => patch({ drawerOpen: true }),
        closeDrawer: () => patch({ drawerOpen: false }),
        closeOverlays: () => patch({ helpOpen: false, drawerOpen: false }),
    };
}
