import type { AbstractIntlMessages } from 'next-intl';

// Namespaces the app's root layout (app/(main)) leaves out of the messages it
// sends to the browser, because no page outside the admin console reads them:
// the admin console gets them from its own layout, and the occasion and
// business pages live under app/(landing). i18n/appMessages.test.ts walks the
// app's import graph to keep this true.
//
// Only list a namespace here when nothing can build its keys at runtime.
// Spring sends some keys to translate (e.g. qrLink.default.*), so a namespace
// that never appears in the frontend code can still be needed.
export const APP_OMITTED_NAMESPACES = ['AdminPage', 'OccasionPages', 'ForBusinessPage'] as const;

export function pickAppMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
    const picked = { ...messages };
    for (const namespace of APP_OMITTED_NAMESPACES) delete picked[namespace];
    return picked;
}
