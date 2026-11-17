import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { THEME_PUBLIC_DTO } from '@/lib/invitation/__fixtures__/themePublicDto';
import en from '@/messages/en.json';

// next/font only works inside a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

// The real page, loader and renderer; only the network, the locale and notFound are stubbed.
vi.mock('next-intl/server', () => ({
    getLocale: async () => 'en',
    getTranslations: async (namespace: keyof typeof en) => (key: string) => (en[namespace] as Record<string, string>)[key],
}));
const notFound = vi.hoisted(() =>
    vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
);
vi.mock('next/navigation', () => ({ notFound }));

import Page, { generateMetadata } from './page';

const fetchMock = vi.fn();

// The catalogue knows one active theme; the font catalogue answers an empty list.
function backend(themeStatus = 200) {
    fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/api/invitation-fonts/files')) return new Response('[]', { status: 200 });
        if (url.endsWith(`/api/invitation-themes/${THEME_PUBLIC_DTO.slug}`) && themeStatus === 200) {
            return new Response(JSON.stringify(THEME_PUBLIC_DTO), { status: 200 });
        }
        if (url.includes('/api/invitation-themes/')) return new Response(null, { status: themeStatus === 200 ? 404 : themeStatus });
        throw new Error(`Unexpected fetch ${url}`);
    });
}

async function renderPage(params: Record<string, string> = {}) {
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            {await Page({ searchParams: Promise.resolve(params) })}
        </NextIntlClientProvider>,
    );
}

const themeCalls = () => fetchMock.mock.calls.map(([url]) => url as string).filter((url) => url.includes('/api/invitation-themes/'));
const imageSources = () => [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'));

beforeEach(() => {
    // jsdom has no ResizeObserver, and the sample's fitted texts need one.
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        disconnect() {}
    });
    // Sections with effects watch for coming on screen.
    stubIntersectionObserver();
    fetchMock.mockReset();
    notFound.mockClear();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('Save my date preview page', () => {
    it("draws the theme a link names: its starting invitation, design and images", async () => {
        backend();
        await renderPage({ theme: THEME_PUBLIC_DTO.slug });
        expect(themeCalls()).toEqual([expect.stringMatching(/\/api\/invitation-themes\/sample-wedding-001$/)]);
        expect(document.querySelectorAll('[data-section-id]')).toHaveLength(5);
        expect(screen.getByText('Πρόσκληση')).toBeInTheDocument();
        expect(imageSources()).toContain('/images/post-florals.png');
        expect(document.querySelector<HTMLElement>('.smd-invitation')?.getAttribute('style')).toContain('#c9a96e');
    });

    it('is a 404 for a theme that is not there or not active', async () => {
        backend();
        await expect(Page({ searchParams: Promise.resolve({ theme: 'no-such-theme' }) })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(themeCalls()).toHaveLength(1);
    });

    it('is a 404 without asking the backend when the link names no valid slug', async () => {
        backend();
        await expect(Page({ searchParams: Promise.resolve({ theme: '../admin' }) })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(themeCalls()).toHaveLength(0);
    });

    it('fails, rather than showing a 404, when the backend does', async () => {
        backend(503);
        await expect(Page({ searchParams: Promise.resolve({ theme: THEME_PUBLIC_DTO.slug }) })).rejects.toThrow('503');
        expect(notFound).not.toHaveBeenCalled();
    });

    it('keeps the made-up sample without a theme', async () => {
        backend();
        await renderPage({ date: 'calendar', lang: 'en' });
        expect(themeCalls()).toHaveLength(0);
        expect(document.querySelector('[data-section-id="s-top"]')).not.toBeNull();
        expect(imageSources()).toContain('/images/couple-hero.png');
    });

    it('is never indexed', async () => {
        expect(await generateMetadata()).toEqual({ title: en.SaveMyDatePreview.metaTitle, robots: { index: false, follow: false } });
    });

    it('is not there on the production site before launch', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        backend();
        await expect(Page({ searchParams: Promise.resolve({ theme: THEME_PUBLIC_DTO.slug }) })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
