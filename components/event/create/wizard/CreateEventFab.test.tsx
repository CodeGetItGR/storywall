import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DiscountCampaignLiveDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    params: new URLSearchParams(),
    user: null as null | { role: string },
    flag: true,
    campaign: null as DiscountCampaignLiveDto | null,
    consent: { ads: false, analytics: false } as null | undefined | { ads: boolean; analytics: boolean },
}));
vi.mock('@/hooks/useCookieConsent', () => ({ useCookieConsent: () => ({ consent: state.consent }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => state.params }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => state.campaign }));
vi.mock('@/providers/CreateWizardFlagProvider', () => ({
    useCreateWizardEnabled: () => state.flag,
    useCreateEventButtonLabel: () => 'Create an event',
}));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: { percent: string }) => (values ? `${key}:${values.percent}` : key),
}));

import { CreateEventFab } from '@/components/event/create/wizard/CreateEventFab';

type Entry = { target: Element; isIntersecting: boolean };
let observerCallback: ((entries: Entry[]) => void) | null = null;

const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' } as DiscountCampaignLiveDto;

function addHero(createHref: string) {
    const hero = document.createElement('a');
    hero.setAttribute('data-hero-create', createHref);
    hero.href = '#pricing';
    document.body.append(hero);
    return hero;
}

function scrollHeroAway(hero: Element) {
    act(() => observerCallback?.([{ target: hero, isIntersecting: false }]));
}

// The hero's own link is a link too, so the button is found by its tracking mark.
const fab = () => document.querySelector('[data-landing-click*="phone_create"]');

beforeEach(() => {
    vi.stubGlobal(
        'IntersectionObserver',
        class {
            constructor(callback: (entries: Entry[]) => void) {
                observerCallback = callback;
            }
            observe() {}
            disconnect() {}
        },
    );
    observerCallback = null;
    state.params = new URLSearchParams();
    state.user = null;
    state.flag = true;
    state.campaign = null;
    state.consent = { ads: false, analytics: false };
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

describe('CreateEventFab', () => {
    it('waits for the cookie question, which holds the same spot, to be answered', () => {
        const hero = addHero('/events/new');
        state.consent = null;
        const { rerender } = render(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()?.className ?? 'invisible').toContain('invisible');
        state.consent = { ads: false, analytics: false };
        rerender(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()?.className).not.toContain('invisible');
    });

    it('never shows with the flag off', () => {
        state.flag = false;
        const hero = addHero('/events/new');
        render(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()).toBeNull();
    });

    it('waits for the hero button to scroll away, then links where the hero creates', () => {
        const hero = addHero('/events/new?type=baptism');
        render(<CreateEventFab />);
        expect(fab()).toBeNull();
        scrollHeroAway(hero);
        expect(fab()).toHaveAttribute('href', '/events/new?type=baptism');
        expect(fab()).toHaveTextContent('Create an event');
        expect(fab()).toHaveAttribute('data-landing-click', JSON.stringify({ event: 'create', placement: 'phone_create' }));
        expect(fab()).toHaveClass('min-[761px]:hidden', '[body:has(#landing-mobile-menu.flex)_&]:hidden');
    });

    it('stays hidden on a page without a hero create button', () => {
        render(<CreateEventFab />);
        expect(observerCallback).toBeNull();
        expect(fab()).toBeNull();
    });

    it('hides while the wizard is open', () => {
        state.params = new URLSearchParams('create=1');
        const hero = addHero('/events/new');
        render(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()).toBeNull();
    });

    it('is never shown to admins', () => {
        state.user = { role: 'ADMIN' };
        const hero = addHero('/events/new');
        render(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()).toBeNull();
    });

    it('carries the offer during a sale', () => {
        state.campaign = campaign;
        const hero = addHero('/events/new?type=wedding');
        render(<CreateEventFab />);
        scrollHeroAway(hero);
        expect(fab()).toHaveAttribute('href', '/events/new?type=wedding');
        expect(fab()).toHaveTextContent('campaignButton:20');
        expect(fab()).toHaveTextContent('getStarted');
        expect(fab()).not.toHaveTextContent('Create an event');
        expect(fab()).toHaveAttribute('data-landing-click', JSON.stringify({ event: 'create', placement: 'phone_create_sale' }));
        expect(fab()).toHaveClass('min-[761px]:hidden', '[body:has(#landing-mobile-menu.flex)_&]:hidden');
    });
});
