import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignChange } from '@/components/admin/campaigns/CampaignChange';
import type { Change } from '@/lib/campaignCompare';
import messages from '@/messages/en.json';

function renderChange(change: Change | null, compared: string | null = '1 Oct – 30 Oct') {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignChange change={change} compared={compared} />
        </NextIntlClientProvider>,
    );
}

describe('CampaignChange', () => {
    afterEach(cleanup);

    it('shows a rise as an arrow and a percent, named by its words', () => {
        renderChange({ kind: 'percent', direction: 'up', ratio: 0.12 });

        expect(screen.getByText('12%')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Up 12%. Compared with 1 Oct – 30 Oct' })).toBeInTheDocument();
    });

    it('shows a small fall as a count', () => {
        renderChange({ kind: 'count', direction: 'down', amount: 2 });

        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Down 2. Compared with 1 Oct – 30 Oct' })).toBeInTheDocument();
    });

    it('says same without a number', () => {
        renderChange({ kind: 'same' });

        expect(screen.getByRole('button', { name: 'Same. Compared with 1 Oct – 30 Oct' })).toBeInTheDocument();
    });

    it('shows its words on a tap', () => {
        renderChange({ kind: 'percent', direction: 'up', ratio: 0.12 });

        fireEvent.click(screen.getByRole('button', { name: 'Up 12%. Compared with 1 Oct – 30 Oct' }));

        expect(screen.getByText('Up 12%. Compared with 1 Oct – 30 Oct')).toBeInTheDocument();
    });

    it('shows nothing with no previous period', () => {
        const { container } = renderChange(null, null);

        expect(container).toBeEmptyDOMElement();
    });
});
