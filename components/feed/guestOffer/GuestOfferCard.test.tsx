import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuestOfferDto } from '@/lib/api/types';

import { GuestOfferCard } from './GuestOfferCard';

const claimCode = vi.fn();
const close = vi.fn();
const copyCode = vi.fn();
let offer: GuestOfferDto | null = null;

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
vi.mock('@/hooks/useGuestOffer', () => ({
    useGuestOffer: () => ({ offer, claimCode, isClaiming: false, claimFailed: false, close, copyCode, isCopied: false }),
}));

describe('GuestOfferCard', () => {
    beforeEach(() => {
        offer = null;
        vi.clearAllMocks();
    });

    afterEach(cleanup);

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
        expect(screen.getByRole('link', { name: /discover/ })).toHaveAttribute('href', '/?utm_source=storywall&utm_medium=feed&utm_campaign=guest-offer');
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
