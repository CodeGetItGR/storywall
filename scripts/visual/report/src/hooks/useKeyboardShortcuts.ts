import { useEffect } from 'react';
import { flushSync } from 'react-dom';

import { type Shortcut, shortcutFor } from '../lib/shortcuts';
import { canCompare, canZoom } from '../lib/viewState';
import type { ReportView } from './useReportView';

export const SEARCH_INPUT_ID = 'story-search';

// Under 880px the search box is in the closed drawer, where it can't take focus, so the drawer opens first. Its own effect may move focus to the list, so the search box takes focus after that.
function findStory(view: ReportView) {
    const search = document.getElementById(SEARCH_INPUT_ID);
    search?.focus();
    if (!search || document.activeElement === search) return;
    flushSync(view.openDrawer);
    search.focus();
}

function run(shortcut: Shortcut, view: ReportView) {
    switch (shortcut) {
        case 'next':
            return view.goNext();
        case 'previous':
            return view.goPrevious();
        case 'mark':
            return view.markCurrent();
        case 'capture':
            return view.cycleCapture();
        case 'side':
        case 'slider':
        case 'diff':
            return canCompare(view.entry) ? view.setCompare(shortcut) : undefined;
        case 'zoom':
            return canZoom(view.entry, view.compare) ? view.toggleZoom() : undefined;
        case 'mode':
            return view.hasGroups ? view.toggleMode() : undefined;
        case 'find':
            return findStory(view);
        case 'help':
            return view.toggleHelp();
    }
}

export function useKeyboardShortcuts(view: ReportView) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const input = event.target instanceof HTMLInputElement ? event.target : null;
            const typing = input?.type === 'text';
            if (event.key === 'Escape') {
                view.closeOverlays();
                if (typing) input?.blur();
                return;
            }
            if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
            const shortcut = shortcutFor(event);
            if (!shortcut) return;
            // Holding a key repeats it. Only the arrows should, so holding R doesn't mark item after item unseen.
            if (event.repeat && shortcut !== 'next' && shortcut !== 'previous') return;
            // The help covers the page, so behind it only ? works, and Esc above.
            if (view.helpOpen && shortcut !== 'help') return;
            // Arrow keys move the slider while it has focus.
            if (input?.type === 'range' && (shortcut === 'next' || shortcut === 'previous')) return;
            event.preventDefault();
            run(shortcut, view);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });
}
