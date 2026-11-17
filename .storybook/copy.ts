import type { Globals } from 'storybook/internal/types';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The catalog for the language picked in the toolbar, so a play function can
// find text in either language.
export function copyFor(globals: Globals): typeof en {
    return globals.locale === 'el' ? (el as typeof en) : en;
}
