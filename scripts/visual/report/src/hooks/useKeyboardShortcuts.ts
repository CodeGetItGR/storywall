import { useEffect } from 'react';

import { type Shortcut, shortcutFor } from '../lib/shortcuts';
import type { ReportView } from './useReportView';

export const SEARCH_INPUT_ID = 'story-search';

function run(shortcut: Shortcut, view: ReportView) {
    const canCompare = view.entry?.state === 'changed';
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
            return canCompare ? view.setCompare(shortcut) : undefined;
        case 'zoom':
            return view.toggleZoom();
        case 'mode':
            return view.hasGroups ? view.toggleMode() : undefined;
        case 'find':
            return document.getElementById(SEARCH_INPUT_ID)?.focus();
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
            // Arrow keys move the slider while it has focus.
            if (input?.type === 'range' && (shortcut === 'next' || shortcut === 'previous')) return;
            event.preventDefault();
            run(shortcut, view);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });
}
