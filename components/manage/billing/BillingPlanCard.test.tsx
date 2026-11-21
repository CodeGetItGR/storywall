import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { BillingPlanCard } from '@/components/manage/billing/BillingPlanCard';
import { billingData, billingSchedule, billingUsage } from '@/components/manage/billing/billingStoryFixtures';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.EventPlanSettingsPage;

function renderCard(props: Partial<Parameters<typeof BillingPlanCard>[0]> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BillingPlanCard data={billingData} schedule={billingSchedule} usage={billingUsage} {...props} />
        </NextIntlClientProvider>,
    );
}

describe('BillingPlanCard', () => {
    it('shows the plan, how long photos are kept, and storage and members against their limits', () => {
        renderCard();
        expect(screen.getByRole('heading', { name: t.yourPlan.title })).toBeInTheDocument();
        expect(screen.getByText('Premium')).toBeInTheDocument();
        expect(screen.getByText(t.coverage.keptUntil)).toBeInTheDocument();
        expect(screen.getByText(t.compare.storage).nextElementSibling?.textContent).toBe('1.2 GB / 10 GB');
        expect(screen.getByText(t.compare.members).nextElementSibling?.textContent).toBe('58 / 100');
    });

    it('says Unlimited instead of a bar when there is no limit', () => {
        renderCard({ usage: { ...billingUsage, memberLimit: null } });
        expect(screen.getByText(t.compare.members).nextElementSibling?.textContent).toBe('58');
        expect(screen.getByText(t.compare.unlimited)).toBeInTheDocument();
    });

    it('leaves the limits out until usage loads', () => {
        renderCard({ usage: null });
        expect(screen.queryByText(t.compare.storage)).not.toBeInTheDocument();
        expect(screen.getByText(t.coverage.keptUntil)).toBeInTheDocument();
    });
});
