import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuestOfferDto } from '@/lib/api/types';

import { GuestOfferCard } from './GuestOfferCard';

const claimCode = vi.fn();
const close = vi.fn();
const copyCode = vi.fn();
const markDiscovered = vi.fn();
let offer: GuestOfferDto | null = null;
let campaign: { id: string; percent: number; startsAt: string; endsAt: string } | null = null;

vi.mock('next-intl', () => {
    const t = (key: string) => key;
    t.rich = (key: string, values: Record<string, unknown>) => {
        const pct = values.pct as (chunks: ReactNode) => ReactNode;
        return (
            <>
                {key} {pct(`${values.percent as number}%`)}
            </>
        );
    };
    return { useTranslations: () => t, useLocale: () => 'en' };
});
vi.mock('@/components/common/Logo', () => ({ Logo: () => <span>StoryWall</span> }));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: () => campaign }));
vi.mock('@/components/siteNotices/CampaignCountdown', () => ({ CampaignCountdown: () => <span>countdown</span> }));
vi.mock('@/hooks/useGuestOffer', () => ({
    useGuestOffer: () => ({
        offer,
        claimCode,
        isClaiming: false,
        claimFailed: false,
        close,
        copyCode,
        isCopied: false,
        markDiscovered,
        seenRef: { current: null },
    }),
}));

describe('GuestOfferCard', () => {
    beforeEach(() => {
        offer = null;
        campaign = null;
        vi.clearAllMocks();
    });

    afterEach(cleanup);

    const live = { id: 'c1', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' };

    it('replaces the claim with the campaign and a link to the plans', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.queryByRole('button', { name: /claim/ })).not.toBeInTheDocument();
        expect(screen.getByText('countdown')).toBeInTheDocument();
        expect(screen.getByText('campaign')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'seePlans' })).toHaveAttribute(
            'href',
            '/?utm_source=storywall&utm_medium=feed&utm_campaign=guest-offer#pricing',
        );
    });

    it('counts a tap on the plans link', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('link', { name: 'seePlans' }));

        expect(markDiscovered).toHaveBeenCalledOnce();
    });

    it('keeps a code the guest already claimed', () => {
        offer = { discountPercent: 15, code: 'ABC123', endsAt: null };
        campaign = live;
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.queryByText('campaign')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /discover/ })).toBeInTheDocument();
    });

    it('shows the claim again once the campaign ends', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(screen.getByRole('button', { name: /claim/ })).toBeInTheDocument();
    });

    it('renders nothing when the card does not show', () => {
        const { container } = render(<GuestOfferCard eventId="e1" isHost={false} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('offers the discount and links to the landing page with the campaign tag', () => {
        offer = { discountPercent: 15, code: null, endsAt: null };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('button', { name: /claim/ }));

        expect(claimCode).toHaveBeenCalledOnce();
        expect(screen.getByText('15%')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /discover/ })).toHaveAttribute(
            'href',
            '/?utm_source=storywall&utm_medium=feed&utm_campaign=guest-offer',
        );
    });

    it('counts a tap on Discover', () => {
        offer = { discountPercent: 10, code: null, endsAt: null };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('link', { name: /discover/ }));

        expect(markDiscovered).toHaveBeenCalledOnce();
    });

    it('shows the claimed code with a copy button instead of the claim button', () => {
        offer = { discountPercent: 10, code: 'GS-7KQ4M2XR9P', endsAt: '2027-10-31T22:00:00Z' };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('button', { name: /copy/ }));

        expect(screen.getByText('GS-7KQ4M2XR9P')).toBeInTheDocument();
        expect(copyCode).toHaveBeenCalledOnce();
        expect(screen.queryByRole('button', { name: /claim/ })).not.toBeInTheDocument();
    });

    it('closes from the close button', () => {
        offer = { discountPercent: 10, code: null, endsAt: null };
        render(<GuestOfferCard eventId="e1" isHost={false} />);

        fireEvent.click(screen.getByRole('button', { name: 'close' }));

        expect(close).toHaveBeenCalledOnce();
    });
});
