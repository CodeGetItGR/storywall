import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignDiscountBadge } from '@/components/admin/campaigns/CampaignDiscountBadge';
import type { CampaignDiscountViewDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const DISCOUNT: CampaignDiscountViewDto = {
    id: 'discount-1',
    percent: 50,
    label: 'Launch offer',
    startsAt: '2026-06-01T07:00:00Z',
    endsAt: '2026-06-30T20:59:00Z',
    stoppedAt: null,
    status: 'ENDED',
};

function renderBadge(discount: CampaignDiscountViewDto, withDates = false) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignDiscountBadge discount={discount} withDates={withDates} />
        </NextIntlClientProvider>,
    );
}

describe('CampaignDiscountBadge', () => {
    afterEach(cleanup);

    it('shows an ended discount', () => {
        const { container } = renderBadge(DISCOUNT);

        expect(container).not.toBeEmptyDOMElement();
    });

    it('shows nothing for a stopped discount, on a row or in a header', () => {
        const stopped = { ...DISCOUNT, status: 'OFF' as const, stoppedAt: '2026-06-10T09:00:00Z' };

        expect(renderBadge(stopped).container).toBeEmptyDOMElement();
        cleanup();
        expect(renderBadge(stopped, true).container).toBeEmptyDOMElement();
    });
});
