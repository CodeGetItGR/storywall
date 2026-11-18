import { act, cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storyAddonStepCheckout } from '@/.storybook/featureAddons';
import { PublishAddonSheet } from '@/components/saveMyDate/editor/publish/PublishAddonSheet';
import type { InvitationDocument } from '@/lib/invitation/document';
import messages from '@/messages/en.json';

const mocks = vi.hoisted(() => ({
    offer: { isLoading: false, failed: false, step: null as unknown },
    pending: false,
}));

vi.mock('@/hooks/useBusinessProfile', () => ({ useCheckoutBuyer: () => ({ notice: null }) }));
vi.mock('@/hooks/useInvitationAddonStep', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/hooks/useInvitationAddonStep')>();
    const { useEffect } = await import('react');
    return {
        ...actual,
        useInvitationAddonOffer: () => mocks.offer,
        useInvitationAddonCheckout: ({ onPendingChange }: { onPendingChange?: (isPending: boolean) => void }) => {
            useEffect(() => onPendingChange?.(mocks.pending), [onPendingChange]);
            return storyAddonStepCheckout({ isPending: mocks.pending });
        },
    };
});

const document = { sections: [] } as unknown as InvitationDocument;

function renderSheet() {
    const step = { open: true, eventId: 'evt-1', close: vi.fn(), fallBack: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <PublishAddonSheet step={step} draftId="draft-1" document={document} />
        </NextIntlClientProvider>,
    );
    return step;
}

describe('PublishAddonSheet', () => {
    beforeEach(() => {
        mocks.offer = { isLoading: false, failed: false, step: null };
        mocks.pending = false;
    });
    afterEach(cleanup);

    it("shows a loader while the event's offers load", () => {
        mocks.offer = { isLoading: true, failed: false, step: null };
        const step = renderSheet();

        expect(screen.getByRole('status')).toBeTruthy();
        expect(step.fallBack).not.toHaveBeenCalled();
    });

    it('goes on publishing when the event has the invitation now', () => {
        const step = renderSheet();

        expect(step.fallBack).toHaveBeenCalledWith('publish');
    });

    it("falls back to the plan dialog when the offers can't be read", () => {
        mocks.offer = { isLoading: false, failed: true, step: null };
        const step = renderSheet();

        expect(step.fallBack).toHaveBeenCalledWith('plan');
    });

    it('shows the step, and takes the close button away while paying', () => {
        mocks.offer = { isLoading: false, failed: false, step: storyAddonStepCheckout().step };
        const step = renderSheet();

        expect(screen.getByRole('heading', { name: 'Add the invitation to your plan' })).toBeTruthy();
        expect(screen.getByRole('button', { name: messages.InvitationEditor.close })).toBeTruthy();
        expect(step.fallBack).not.toHaveBeenCalled();
        cleanup();

        mocks.pending = true;
        renderSheet();
        expect(screen.queryByRole('button', { name: messages.InvitationEditor.close })).toBeNull();
    });

    it('ignores Back while paying, and closes on Back otherwise', async () => {
        mocks.offer = { isLoading: false, failed: false, step: storyAddonStepCheckout().step };
        const pressBack = async () => {
            // The sheet adds its history entry in a microtask; Back then pops it.
            await act(async () => {
                await Promise.resolve();
                window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
            });
        };

        mocks.pending = true;
        const paying = renderSheet();
        await pressBack();
        expect(paying.close).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'Add the invitation to your plan' })).toBeTruthy();
        cleanup();

        mocks.pending = false;
        const idle = renderSheet();
        await pressBack();
        expect(idle.close).toHaveBeenCalled();
    });
});
