import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QrLandingPromo } from '@/components/qrLanding/QrLandingPromo';
import { useLiveDiscountCampaign } from '@/hooks/useLiveDiscountCampaign';
import type { DiscountCampaignLiveDto } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useLocale: () => 'el',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useLiveDiscountCampaign', () => ({ useLiveDiscountCampaign: vi.fn() }));
vi.mock('@/components/siteNotices/CampaignCountdown', () => ({ CampaignCountdown: ({ endsAt }: { endsAt: string }) => <span>ends {endsAt}</span> }));

const mockedCampaign = vi.mocked(useLiveDiscountCampaign);

// KAN-208: the foot of the QR choice page shows the live discount, or a teaser with none.
describe('QrLandingPromo', () => {
    beforeEach(() => mockedCampaign.mockReset());
    afterEach(cleanup);

    it('shows the discount, its countdown and the link while a campaign is live', () => {
        mockedCampaign.mockReturnValue({ id: 'c1', percent: 50, endsAt: '2026-11-30T21:59:00Z' } as DiscountCampaignLiveDto);
        render(<QrLandingPromo />);

        expect(screen.getByText('percentOff:{"percent":"50"}')).toBeInTheDocument();
        expect(screen.getByText('ends 2026-11-30T21:59:00Z')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'title' })).toBeInTheDocument();
        expect(screen.queryByText('line')).toBeNull();
    });

    it('shows the teaser with no campaign', () => {
        mockedCampaign.mockReturnValue(null);
        render(<QrLandingPromo />);

        expect(screen.getByRole('heading', { name: 'title' })).toBeInTheDocument();
        expect(screen.getByText('line')).toBeInTheDocument();
        expect(screen.queryByText(/percentOff/)).toBeNull();
    });

    it('opens the home page in a new tab, tagged as the QR banner', () => {
        mockedCampaign.mockReturnValue(null);
        render(<QrLandingPromo />);

        const link = screen.getByRole('link', { name: 'discover' });
        expect(link).toHaveAttribute('target', '_blank');
        expect(link.getAttribute('href')).toContain('utm_medium=qr');
        expect(link.getAttribute('href')).toContain('utm_campaign=qr-promo');
    });
});
