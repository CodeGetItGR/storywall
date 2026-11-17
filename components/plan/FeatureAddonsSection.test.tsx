import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyFeatureAddons, storyFeatureAddonsReady, storyGalleryAddon, storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonsSection } from '@/components/plan/FeatureAddonsSection';
import type { FeatureAddons } from '@/hooks/useFeatureAddons';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useBusinessProfile', () => ({ useCheckoutBuyer: () => ({ notice: null }) }));

function renderSection(state: FeatureAddons) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <FeatureAddonsSection state={state} />
        </NextIntlClientProvider>,
    );
}

describe('FeatureAddonsSection', () => {
    afterEach(cleanup);

    it('lists each feature with its one-time price under "Add features"', () => {
        renderSection(storyFeatureAddons());

        expect(screen.getByRole('heading', { name: 'Add features' })).toBeTruthy();
        expect(screen.getByRole('checkbox', { name: /Online invitation.*€29\.00 once/ })).toBeTruthy();
        expect(screen.getByRole('checkbox', { name: /RSVP.*€9\.00 once/ })).toBeTruthy();
        // Nothing ticked: no total and no pay button yet.
        expect(screen.queryByText(/^Total:/)).toBeNull();
        expect(screen.queryByRole('button', { name: /^Pay/ })).toBeNull();
    });

    it('ticks a feature through toggle', () => {
        const toggle = vi.fn();
        renderSection(storyFeatureAddons({ toggle }));

        fireEvent.click(screen.getByRole('checkbox', { name: /Gallery/ }));
        expect(toggle).toHaveBeenCalledWith(storyGalleryAddon.code);
    });

    it('shows the total, the consent and the pay button once something is ticked', () => {
        const pay = vi.fn(async () => {});
        renderSection(storyFeatureAddonsReady({ pay }));

        expect(screen.getByText('Total: €38.00')).toBeTruthy();
        expect(screen.getByText(messages.CheckoutReviewPage.withdrawalTerms.addonsBody)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Pay €38.00' }));
        expect(pay).toHaveBeenCalled();
    });

    it('keeps the pay button off until the host may pay', () => {
        renderSection(storyFeatureAddonsReady({ canPay: false }));

        expect((screen.getByRole('button', { name: 'Pay €38.00' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('pauses buying while a withdrawal is under review', () => {
        renderSection(storyFeatureAddonsReady({ paused: true }));

        expect(screen.getByText('Add-ons are paused while your withdrawal is under review.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /^Pay/ })).toBeNull();
        expect((screen.getByRole('checkbox', { name: /RSVP/ }) as HTMLInputElement).disabled).toBe(true);
    });

    it('tells a co-host why buying is off', () => {
        renderSection(storyFeatureAddons({ purchaseBlock: 'primaryHostOnly', canPurchase: false }));

        expect(screen.getByText(messages.Common.primaryHostOnly)).toBeTruthy();
        expect((screen.getByRole('checkbox', { name: /RSVP/ }) as HTMLInputElement).disabled).toBe(true);
    });

    it('adds and removes features on a draft, paid with the plan', () => {
        const setDraftAddon = vi.fn(async () => {});
        renderSection(
            storyFeatureAddons({
                mode: 'draft',
                offers: [
                    { service: storySaveMyDateAddon, added: false },
                    { service: storyRsvpAddon, added: true },
                ],
                setDraftAddon,
            }),
        );

        expect(screen.getByText('Paid with the plan.')).toBeTruthy();
        expect(screen.queryByRole('checkbox')).toBeNull();
        const rows = screen.getAllByRole('listitem');
        fireEvent.click(within(rows[0]!).getByRole('button', { name: 'Add' }));
        expect(setDraftAddon).toHaveBeenCalledWith(storySaveMyDateAddon.code, true);
        fireEvent.click(within(rows[1]!).getByRole('button', { name: 'Remove' }));
        expect(setDraftAddon).toHaveBeenCalledWith(storyRsvpAddon.code, false);
    });

    it('shows a refusal', () => {
        renderSection(storyFeatureAddons({ error: 'This feature is already on your event.' }));

        expect(screen.getByRole('alert').textContent).toBe('This feature is already on your event.');
    });

    it('renders nothing with no features on offer, while loading, or when add-ons cannot change', () => {
        const { container: empty } = renderSection(storyFeatureAddons({ offers: [] }));
        expect(empty.innerHTML).toBe('');
        cleanup();
        const { container: loading } = renderSection(storyFeatureAddons({ isLoading: true }));
        expect(loading.innerHTML).toBe('');
        cleanup();
        const { container: closed } = renderSection(storyFeatureAddons({ mode: null }));
        expect(closed.innerHTML).toBe('');
    });
});
