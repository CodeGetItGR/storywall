import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DiscountCampaignLiveDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    campaign: null as DiscountCampaignLiveDto | null,
    consent: { analytics: true, ads: false } as object | null | undefined,
}));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => state.campaign }));
vi.mock('@/hooks/useCookieConsent', () => ({ useCookieConsent: () => ({ consent: state.consent }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { LandingSaleButton } from '@/components/landing/LandingSaleButton';
import { discountCampaignDismissalKey } from '@/lib/discountCampaign';
import { DISMISSED_COOKIE, writeDismissalsCookie } from '@/lib/siteNoticeDismissals';

const campaign = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' } as DiscountCampaignLiveDto;

function addPricing(top: number, id = 'pricing') {
    const pricing = document.createElement('section');
    pricing.id = id;
    pricing.getBoundingClientRect = () => ({ top }) as DOMRect;
    document.body.append(pricing);
}

function scrollTo(y: number) {
    act(() => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
        window.dispatchEvent(new Event('scroll'));
    });
}

const link = () => screen.getByRole('link', { hidden: true });

describe('LandingSaleButton', () => {
    beforeEach(() => {
        state.campaign = campaign;
        state.consent = { analytics: true, ads: false };
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    });

    afterEach(() => {
        cleanup();
        document.getElementById('pricing')?.remove();
        document.getElementById('qr-plans')?.remove();
        document.cookie = `${DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('renders nothing without a live campaign', () => {
        state.campaign = null;
        const { container } = render(<LandingSaleButton />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing once the campaign notice is closed', () => {
        addPricing(3000);
        render(<LandingSaleButton />);
        act(() => writeDismissalsCookie(discountCampaignDismissalKey(campaign.id)));
        expect(screen.queryByRole('link', { hidden: true })).toBeNull();
    });

    it('appears after the first screen and links to the plans', () => {
        addPricing(3000);
        render(<LandingSaleButton />);
        expect(link()).toHaveClass('invisible');
        scrollTo(900);
        expect(link()).toHaveClass('visible');
        expect(link()).toHaveAttribute('href', '#pricing');
        expect(link()).toHaveTextContent('campaignButton');
        expect(link()).toHaveTextContent('seePlans');
    });

    it('stays hidden while the cookie question is open', () => {
        state.consent = null;
        addPricing(3000);
        render(<LandingSaleButton />);
        scrollTo(900);
        expect(link()).toHaveClass('invisible');
    });

    it("goes to a page's own plans section", () => {
        addPricing(3000, 'qr-plans');
        render(<LandingSaleButton pricingId="qr-plans" />);
        scrollTo(900);
        expect(link()).toHaveAttribute('href', '#qr-plans');
        expect(link()).toHaveClass('visible');
    });
});
