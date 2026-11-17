import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingExtensionSection } from '@/components/manage/billing/BillingExtensionSection';
import { ApiError } from '@/lib/api/client';
import type { EventStatus, ExtensionOptionResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({ useExtensionOptions: vi.fn() }));

vi.mock('@/hooks/useBilling', () => ({ useExtensionOptions: mocks.useExtensionOptions }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/event-1/manage',
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2000-01-01T00:00:00Z';

const option: ExtensionOptionResponseDto = {
    coverageOptionId: 'ext-3',
    months: 3,
    amountMinor: 1500,
    currency: 'EUR',
    resultingCoverageEndsAt: '2099-04-01T00:00:00Z',
    breakdown: {} as ExtensionOptionResponseDto['breakdown'],
};

function optionsResult(data: ExtensionOptionResponseDto[] | undefined, error: unknown = null) {
    return { data, error, isLoading: false, refetch: vi.fn() };
}

function renderSection({
    eventStatus = 'ACTIVE',
    coverageEndsAt = FUTURE,
    canPurchase = true,
}: { eventStatus?: EventStatus; coverageEndsAt?: string | null; canPurchase?: boolean } = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <BillingExtensionSection eventId="event-1" eventStatus={eventStatus} coverageEndsAt={coverageEndsAt} canPurchase={canPurchase} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);
beforeEach(() => {
    mocks.useExtensionOptions.mockReset();
    mocks.useExtensionOptions.mockReturnValue(optionsResult([option]));
});

describe('BillingExtensionSection', () => {
    it('shows the length as a picked tile, its estimated end, and one button to the checkout review', () => {
        renderSection();

        expect(screen.getByText('Extend coverage')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /\+3 months/ })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText(/New end date: .*2099.*\(estimate\)/)).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'Extend coverage by 3 months, €15.00' });
        expect(link).toHaveAttribute('href', '/events/event-1/checkout/review?intent=extension&option=ext-3');
        expect(mocks.useExtensionOptions).toHaveBeenCalledWith('event-1', true);
    });

    it('picks the shortest length first and moves the estimate and the button to another pick', () => {
        const six = { ...option, coverageOptionId: 'ext-6', months: 6, amountMinor: 2500, resultingCoverageEndsAt: '2099-07-01T00:00:00Z' };
        mocks.useExtensionOptions.mockReturnValue(optionsResult([six, option]));
        renderSection();

        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.getByRole('radio', { name: /\+3 months/ })).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(screen.getByRole('radio', { name: /\+6 months/ }));

        expect(screen.getByRole('radio', { name: /\+6 months/ })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText(/New end date: .*Jul.*2099/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Extend coverage by 6 months, €25.00' })).toHaveAttribute(
            'href',
            '/events/event-1/checkout/review?intent=extension&option=ext-6',
        );
    });

    it.each([
        ['a co-host', { canPurchase: false }],
        ['a draft', { eventStatus: 'DRAFT' as const }],
        ['coverage already ended', { coverageEndsAt: PAST }],
        ['no coverage end', { coverageEndsAt: null }],
    ])('renders nothing and does not ask for options for %s', (_label, props) => {
        mocks.useExtensionOptions.mockReturnValue(optionsResult(undefined));

        const { container } = renderSection(props);

        expect(container).toBeEmptyDOMElement();
        expect(mocks.useExtensionOptions).toHaveBeenCalledWith('event-1', false);
    });

    it('renders nothing when the plan sells no extensions', () => {
        mocks.useExtensionOptions.mockReturnValue(optionsResult([]));

        const { container } = renderSection();

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the options fail to load for another reason', () => {
        mocks.useExtensionOptions.mockReturnValue(optionsResult(undefined, new ApiError(500, { status: 500, errorCode: 9001 })));

        const { container } = renderSection();

        expect(container).toBeEmptyDOMElement();
    });

    it('explains that coverage has ended and offers no purchase on 5085', () => {
        mocks.useExtensionOptions.mockReturnValue(optionsResult(undefined, new ApiError(409, { status: 409, errorCode: 5085 })));

        renderSection();

        expect(screen.getByText('Coverage for this event has ended.')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
