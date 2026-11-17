import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BillingUpgradeRow } from '@/components/manage/billing/BillingUpgradeRow';
import type { BillingUpgradeRow as BillingUpgradeRowData } from '@/hooks/useBillingUpgradeRows';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module:${key}` }) }));

afterEach(cleanup);

const t = messages.EventPlanSettingsPage;
const noop = vi.fn();
const row: BillingUpgradeRowData = {
    code: 'PREMIUM_PLUS',
    name: 'Premium Plus',
    durations: [{ id: 'cov-3', months: 3 }],
    durationId: 'cov-3',
    monthsAdded: 3,
    href: '/checkout',
    priceLabel: '€49 now',
    buttonLabel: t.upgrade.cta,
    buttonAriaLabel: 'Upgrade to Premium Plus, 3 months, €49',
    listPriceLabel: null,
    discountLabel: null,
    chips: ['50 GB storage', '+2 features'],
    removedModuleKeys: [],
};

function renderRow(overrides: Partial<BillingUpgradeRowData> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ul>
                <BillingUpgradeRow row={{ ...row, ...overrides }} eventTypeKey="WEDDING" onDurationChangeAction={noop} />
            </ul>
        </NextIntlClientProvider>,
    );
}

describe('BillingUpgradeRow', () => {
    it('shows the price now, the months added and what changes, open', () => {
        renderRow();
        expect(screen.getByText('€49 now')).toBeInTheDocument();
        expect(screen.getByText('+3 months of coverage')).toBeInTheDocument();
        expect(screen.getByRole('list', { name: t.upgrade.whatChanges })).toHaveTextContent('50 GB storage');
        expect(screen.getByRole('link', { name: row.buttonAriaLabel })).toHaveAttribute('href', '/checkout');
    });

    it('crosses out the full price only when a code applies', () => {
        renderRow({ listPriceLabel: '€69', discountLabel: 'SPRING' });
        expect(screen.getByText('€69')).toHaveClass('line-through');
        expect(screen.getByText('SPRING')).toBeInTheDocument();
    });

    it('lists the features an upgrade drops under No longer included', () => {
        renderRow({ removedModuleKeys: ['wishbook'] });
        expect(screen.getByText(t.compare.removedModules)).toBeInTheDocument();
        expect(screen.getByText('module:wishbook')).toBeInTheDocument();
    });
});
