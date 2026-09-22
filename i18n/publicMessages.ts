import type { AbstractIntlMessages } from 'next-intl';

// Header the proxy sets on `/` and `/<locale>` requests. Its presence is how
// the root layout knows it is rendering the public landing page.
export const PUBLIC_LOCALE_HEADER = 'x-storywall-locale';

// Every namespace a client island on the landing page reads. Server-rendered
// sections use getTranslations and never need their messages on the client.
// i18n/publicMessages.test.ts walks the landing import graph to keep this
// list complete.
export const PUBLIC_CLIENT_NAMESPACES = [
    'LandingPage.hero',
    'LandingPage.features',
    'LandingPage.featureDetails',
    'LandingPage.pricing',
    'LandingPage.stack',
    'LanguageSwitcher',
    'Modules',
    'AccountDrawer',
] as const;

function readPath(messages: AbstractIntlMessages, segments: string[]): AbstractIntlMessages | string | undefined {
    let current: AbstractIntlMessages | string | undefined = messages;
    for (const segment of segments) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = current[segment];
    }
    return current;
}

function writePath(target: AbstractIntlMessages, segments: string[], value: AbstractIntlMessages | string): void {
    let current = target;
    for (const segment of segments.slice(0, -1)) {
        const next = current[segment];
        if (typeof next !== 'object' || next === null) current[segment] = {};
        current = current[segment] as AbstractIntlMessages;
    }
    current[segments[segments.length - 1]] = value;
}

export function pickPublicMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
    const picked: AbstractIntlMessages = {};
    for (const namespace of PUBLIC_CLIENT_NAMESPACES) {
        const segments = namespace.split('.');
        const value = readPath(messages, segments);
        if (value !== undefined) writePath(picked, segments, value);
    }
    return picked;
}
