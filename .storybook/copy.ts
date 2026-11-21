import { createTranslator, type Messages } from 'next-intl';
import type { Globals } from 'storybook/internal/types';

import type { PageTranslator } from '@/lib/occasions/pageCopy';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

// The catalog for the language picked in the toolbar, so a play function can
// find text in either language.
export function copyFor(globals: Globals): typeof en {
    return globals.locale === 'el' ? (el as typeof en) : en;
}

// A translator over the toolbar language's catalog, for the section props builders the server uses.
export function translatorFor(globals: Globals, namespace: string): PageTranslator {
    const locale = globals.locale === 'el' ? 'el' : 'en';
    return createTranslator({ locale, messages: (locale === 'el' ? el : en) as Messages, namespace }) as unknown as PageTranslator;
}
