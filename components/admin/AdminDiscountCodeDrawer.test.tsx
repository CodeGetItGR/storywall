import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminDiscountCodeDrawer } from '@/components/admin/AdminDiscountCodeDrawer';
import type { PlanTierResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const basic = {
    id: 'p1',
    code: 'BASIC',
    scope: 'EVENT',
    name: 'Basic',
    sortOrder: 0,
    isAssignable: true,
    priceCurrency: 'EUR',
    discountPercent: null,
    discountStartsAt: null,
    discountEndsAt: null,
    eventTypeKey: 'WEDDING',
    initialOptions: [{ id: 'o1', kind: 'INITIAL', months: 12, priceAmountMinor: 900, promoPriceAmountMinor: null, sortOrder: 0, active: true }],
    extensionOptions: [],
} as unknown as PlanTierResponseDto;

vi.mock('@/hooks/useAdmin', () => ({
    useSaveDiscountCode: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
    useAdminPlanTiers: () => ({ data: [basic], isLoading: false }),
    useAdminPlatformEventTypes: () => ({ data: [{ eventTypeKey: 'WEDDING', sortOrder: 0 }], isLoading: false }),
}));

vi.mock('@/hooks/useLocalizedEventTypeName', () => ({ useLocalizedEventTypeName: () => () => 'Wedding' }));

afterEach(cleanup);

function renderDrawer() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <AdminDiscountCodeDrawer open code={null} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
}

function typePercent(value: string) {
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('spinbutton', { name: /Discount %/ }), { target: { value } });
    act(() => vi.runAllTimers());
    vi.useRealTimers();
}

describe('AdminDiscountCodeDrawer', () => {
    it('shows no warning for a modest discount', () => {
        renderDrawer();
        typePercent('20');
        expect(screen.queryByText(messages.AdminPage.collaborations.codes.warnings.high)).not.toBeInTheDocument();
    });

    it('warns about a high discount, and names a plan it takes under the minimum charge', () => {
        renderDrawer();
        typePercent('60');
        expect(screen.getByText(messages.AdminPage.collaborations.codes.warnings.high)).toBeInTheDocument();
        expect(screen.queryByText(/Checkout won't work/)).not.toBeInTheDocument();

        typePercent('95');
        expect(screen.getByText("Checkout won't work for Basic. The price drops below the minimum charge.")).toBeInTheDocument();
    });
});
