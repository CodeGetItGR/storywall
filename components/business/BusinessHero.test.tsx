import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessHero } from '@/components/business/BusinessHero';
import type { PartnerTierProgressDto, VendorProfileDto } from '@/lib/api/types';
import type { PartnerBalance } from '@/lib/partnerPortal';
import messages from '@/messages/en.json';

const PROFILE = { businessName: 'Studio Lumen', vendorType: 'PHOTOGRAPHER', logoUrl: null, link: null } as VendorProfileDto;
const BALANCES: PartnerBalance[] = [{ currency: 'EUR', earnedMinor: 5000, paidMinor: 2000, owedMinor: 3000 }];
const TIER: PartnerTierProgressDto = {
    currentPercent: 20,
    activationsThisYear: 3,
    nextTierMinActivations: 10,
    nextTierPercent: 25,
} as PartnerTierProgressDto;

function renderHero(overrides: Partial<React.ComponentProps<typeof BusinessHero>> = {}) {
    const onEditAction = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessHero
                profile={PROFILE}
                vendorType="PHOTOGRAPHER"
                partner={false}
                balances={null}
                tierProgress={null}
                onEditAction={onEditAction}
                {...overrides}
            />
        </NextIntlClientProvider>,
    );
    return onEditAction;
}

describe('BusinessHero', () => {
    afterEach(cleanup);

    it('shows the business name and type', () => {
        renderHero();
        expect(screen.getByRole('heading', { name: 'Studio Lumen' })).toBeInTheDocument();
        expect(screen.getByText('Photographer')).toBeInTheDocument();
    });

    it('shows no Partner pill or balances for a non-partner', () => {
        renderHero({ balances: BALANCES });
        expect(screen.queryByText('Partner')).toBeNull();
        expect(screen.queryByText('To be paid')).toBeNull();
    });

    it('shows the Partner pill, balances and commission for a partner', () => {
        renderHero({ partner: true, balances: BALANCES, tierProgress: TIER });
        expect(screen.getByText('Partner')).toBeInTheDocument();
        expect(screen.getByText('To be paid')).toBeInTheDocument();
        expect(screen.getByText('Commission rate')).toBeInTheDocument();
    });

    it('calls onEditAction from the Edit button', () => {
        const onEditAction = renderHero();
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEditAction).toHaveBeenCalledTimes(1);
    });

    it('falls back to "Your business" when there is no profile', () => {
        renderHero({ profile: null, vendorType: null });
        expect(screen.getByRole('heading', { name: 'Your business' })).toBeInTheDocument();
    });
});
