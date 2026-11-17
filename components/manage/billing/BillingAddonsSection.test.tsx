import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';
import messages from '@/messages/en.json';

function renderSection({ hasFeatureAddons }: { hasFeatureAddons?: boolean }) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <BillingAddonsSection eventId="evt-1" addons={[]} currency="EUR" canManage hasFeatureAddons={hasFeatureAddons} />
        </NextIntlClientProvider>,
    );
}

describe('BillingAddonsSection', () => {
    afterEach(cleanup);

    it('points to storage when only storage is on offer', () => {
        renderSection({});

        expect(screen.getByRole('link', { name: messages.EventPlanSettingsPage.addons.addStorage })).toBeTruthy();
    });

    it('says "Manage add-ons" when feature add-ons are on offer (KAN-82)', () => {
        renderSection({ hasFeatureAddons: true });

        expect(screen.getByRole('link', { name: 'Manage add-ons' }).getAttribute('href')).toBe('/events/evt-1/settings/addons');
    });
});
