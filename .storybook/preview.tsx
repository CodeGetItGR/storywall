import '@/app/globals.css';

import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';

import { rootFontClassName } from '@/components/layout/rootFonts';
import { defaultLocale, type Locale } from '@/i18n/config';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const messages = { en, el } as const;

// A fixed zone and clock keep dates in snapshots the same on every machine.
const STORY_TIME_ZONE = 'Europe/Athens';
const STORY_NOW = new Date('2026-06-15T12:00:00Z');

// Components also read the clock directly ("2 hours ago", countdowns, story
// expiry), so Date answers STORY_NOW too while a story renders.
function freezeClock() {
    const RealDate = Date;
    class StoryDate extends RealDate {
        constructor(...args: [] | ConstructorParameters<DateConstructor>) {
            if (args.length === 0) super(STORY_NOW.getTime());
            else super(...(args as ConstructorParameters<DateConstructor>));
        }
        static now() {
            return STORY_NOW.getTime();
        }
    }
    globalThis.Date = StoryDate as DateConstructor;
    return () => {
        globalThis.Date = RealDate;
    };
}

// The app's <html> carries the font classes (see RootDocument); stories render
// inside Storybook's own document, so they are added there.
function StoryDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
    useEffect(() => {
        const html = document.documentElement;
        const classes = [...rootFontClassName.split(' '), 'bg-background'];
        html.classList.add(...classes);
        html.lang = locale;
        return () => html.classList.remove(...classes);
    }, [locale]);

    return (
        <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone={STORY_TIME_ZONE} now={STORY_NOW}>
            {children}
        </NextIntlClientProvider>
    );
}

// A fresh client per story, without retries, so a mocked error shows at once
// and no cached data leaks from one story into the next.
function StoryQueryClient({ children }: { children: ReactNode }) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }));
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// A browser that can't run service workers (some embedded previews) still renders
// every story that doesn't need mocked data, instead of failing them all.
async function startMockWorker() {
    const worker = setupWorker();
    try {
        await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
    } catch (error) {
        console.warn('[MSW] Mocking is off: the service worker could not start.', error);
    }
    return worker;
}

const withProviders: Decorator = (Story, context) => (
    <StoryQueryClient>
        <StoryDocument locale={(context.globals.locale as Locale | undefined) ?? defaultLocale}>
            <Story />
        </StoryDocument>
    </StoryQueryClient>
);

const preview: Preview = {
    decorators: [withProviders],
    // Stories that show server data add their handlers with msw.use() in beforeEach;
    // any other request reaches the network as usual.
    loaders: [mswLoader(startMockWorker)],
    beforeEach: freezeClock,
    globalTypes: {
        locale: {
            description: 'Language',
            toolbar: {
                title: 'Language',
                icon: 'globe',
                items: [
                    { value: 'en', title: 'English' },
                    { value: 'el', title: 'Ελληνικά' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        locale: defaultLocale,
    },
    parameters: {
        nextjs: { appDirectory: true },
        // Any Spring call a story didn't mock answers 404 instead of reaching the
        // network, so a story never depends on a running backend.
        msw: { handlers: { fallback: [http.all('*/api/*', () => HttpResponse.json({ status: 404, errorCode: 'NOT_FOUND' }, { status: 404 }))] } },
        layout: 'padded',
        controls: {
            matchers: { color: /(background|color)$/i, date: /Date$/i },
        },
        viewport: {
            options: {
                mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' }, type: 'mobile' },
                desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
            },
        },
        // Every story is snapshotted at both breakpoints: host and guest screens are mobile-first.
        chromatic: {
            modes: {
                mobile: { viewport: 'mobile' },
                desktop: { viewport: 'desktop' },
            },
        },
        a11y: { test: 'todo' },
    },
};

export default preview;
