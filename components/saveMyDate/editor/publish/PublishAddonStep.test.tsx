import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    storyAddonStepCheckout,
    storyAddonStepReady,
    storyDraftActivationItems,
    storyRsvpAddon,
    storySaveMyDateAddon,
} from '@/.storybook/featureAddons';
import { PublishAddonStep } from '@/components/saveMyDate/editor/publish/PublishAddonStep';
import type { InvitationAddonCheckout } from '@/hooks/useInvitationAddonStep';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useBusinessProfile', () => ({ useCheckoutBuyer: () => ({ notice: null }) }));

function renderStep(checkout: InvitationAddonCheckout, onCancel = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <PublishAddonStep checkout={checkout} onCancel={onCancel} />
        </NextIntlClientProvider>,
    );
    return onCancel;
}

describe('PublishAddonStep', () => {
    afterEach(cleanup);

    it('always includes the invitation and leaves RSVP to the host', () => {
        const handleRsvpChange = vi.fn();
        renderStep(storyAddonStepCheckout({ handleRsvpChange }));

        expect(screen.getByRole('heading', { name: 'Add the invitation to your plan' })).toBeTruthy();
        const invitation = screen.getByRole('checkbox', { name: new RegExp(`${storySaveMyDateAddon.name}.*€29\\.00 once`) }) as HTMLInputElement;
        expect(invitation.checked && invitation.disabled).toBe(true);
        const rsvp = screen.getByRole('checkbox', { name: new RegExp(`${storyRsvpAddon.name}.*€9\\.00 once`) }) as HTMLInputElement;
        expect(rsvp.checked).toBe(false);
        fireEvent.click(rsvp);
        expect(handleRsvpChange).toHaveBeenCalled();
        expect(screen.getByText('Total: €29.00')).toBeTruthy();
        expect(screen.getByText(messages.CheckoutReviewPage.withdrawalTerms.addonsBody)).toBeTruthy();
    });

    it('pays once the host may, and cancels', () => {
        const submit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
        const onCancel = renderStep(storyAddonStepReady({ submit }));

        fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
        expect(submit).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalled();
    });

    it('keeps payment off until the boxes are checked', () => {
        renderStep(storyAddonStepCheckout());

        expect((screen.getByRole('button', { name: 'Continue to payment' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('shows only the invitation when RSVP is not offered, and no total until priced', () => {
        renderStep(
            storyAddonStepCheckout({
                step: { mode: 'draft', saveMyDate: { service: storySaveMyDateAddon, added: false }, rsvp: null },
                totalMinor: null,
            }),
        );

        expect(screen.queryByRole('checkbox', { name: new RegExp(storyRsvpAddon.name) })).toBeNull();
        expect(screen.queryByText(/^Total:/)).toBeNull();
    });

    it('shows a refusal', () => {
        renderStep(storyAddonStepReady({ error: 'This feature is already on your event.' }));

        expect(screen.getByRole('alert').textContent).toBe('This feature is already on your event.');
    });

    it("lists a draft's plan and add-ons with the plan's withdrawal terms", () => {
        renderStep(
            storyAddonStepCheckout({
                step: { mode: 'draft', saveMyDate: { service: storySaveMyDateAddon, added: false }, rsvp: { service: storyRsvpAddon, added: true } },
                rsvpTicked: true,
                draftItems: storyDraftActivationItems(),
                totalMinor: 15_300,
            }),
        );

        expect(screen.getByText('Activation: Lite')).toBeTruthy();
        expect(screen.getByText('Add-on: Guest book')).toBeTruthy();
        expect(screen.getByText('Total: €153.00')).toBeTruthy();
        expect(screen.getByText(messages.CheckoutReviewPage.withdrawalTerms.body)).toBeTruthy();
        expect(screen.queryByText(messages.CheckoutReviewPage.withdrawalTerms.addonsBody)).toBeNull();
    });
});
