import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventModuleConfigDrawer } from '@/components/admin/events/EventModuleConfigDrawer';
import type { AdminEventModuleConfig } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mutations = vi.hoisted(() => ({ set: vi.fn(), reset: vi.fn() }));
vi.mock('@/hooks/useAdminEvents', () => ({
    useSetEventModuleConfig: () => ({ mutate: mutations.set, isPending: false, error: null }),
    useResetEventModuleConfig: () => ({ mutate: mutations.reset, isPending: false, error: null }),
}));

const OVERRIDE = { extra: null, enabled: null, reason: 'Asked', setByUserId: 'a-1', setAt: '2026-10-01T10:00:00Z' };
const MAX_VENDORS: AdminEventModuleConfig = {
    moduleKey: 'vendors',
    configKey: 'maxVendors',
    kind: 'VALUE',
    planValue: 5,
    effectiveValue: 5,
    override: null,
};
const TYPES: AdminEventModuleConfig = {
    moduleKey: 'vendors',
    configKey: 'allowedTypes',
    kind: 'VALUE',
    planValue: ['PLANNER', 'MUSIC'],
    effectiveValue: ['PLANNER', 'MUSIC'],
    override: null,
};
const STORAGE: AdminEventModuleConfig = {
    moduleKey: 'vendors',
    configKey: 'proStorageBytes',
    kind: 'VALUE',
    planValue: 5368709120,
    effectiveValue: 5368709120,
    override: null,
};

function renderDrawer(config: AdminEventModuleConfig, hasModule = true) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <EventModuleConfigDrawer open eventId="e1" config={config} moduleName="Vendors" hasModule={hasModule} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
}

function saveButton() {
    return screen.getByRole('button', { name: 'Save' });
}

function giveReason() {
    fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Only one vendor' } });
}

beforeEach(() => {
    mutations.set.mockReset();
    mutations.reset.mockReset();
});
afterEach(cleanup);

describe('EventModuleConfigDrawer for a vendors setting', () => {
    it("follows the plan at first, showing the plan's value, with nothing to save", () => {
        renderDrawer(MAX_VENDORS);
        expect(screen.getByRole('radio', { name: 'Follow the plan (5)' })).toBeChecked();
        expect(screen.queryByRole('spinbutton')).toBeNull();
        giveReason();
        expect(saveButton()).toBeDisabled();
    });

    it('sets an exact number lower than the plan', () => {
        renderDrawer(MAX_VENDORS);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        const input = screen.getByRole('spinbutton', { name: /Max vendors/ });
        expect(input).toHaveValue(5);
        fireEvent.change(input, { target: { value: '1' } });
        expect(saveButton()).toBeDisabled();
        giveReason();
        expect(saveButton()).toBeEnabled();
        fireEvent.click(saveButton());

        expect(mutations.set).toHaveBeenCalledTimes(1);
        expect(mutations.set.mock.calls[0][0]).toEqual({
            moduleKey: 'vendors',
            configKey: 'maxVendors',
            reason: 'Only one vendor',
            extra: null,
            enabled: null,
            value: 1,
        });
        expect(mutations.reset).not.toHaveBeenCalled();
    });

    it('sets 0 vendors', () => {
        renderDrawer(MAX_VENDORS);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: /Max vendors/ }), { target: { value: '0' } });
        giveReason();
        fireEvent.click(saveButton());
        expect(mutations.set.mock.calls[0][0]).toMatchObject({ value: 0 });
    });

    it('blocks a number it cannot save and says why', () => {
        renderDrawer(MAX_VENDORS);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: /Max vendors/ }), { target: { value: '-1' } });
        giveReason();
        expect(screen.getByText('Enter a whole number from 0 to 2,147,483,647.')).toBeInTheDocument();
        expect(screen.getByRole('spinbutton', { name: /Max vendors/ })).toHaveAttribute('aria-invalid', 'true');
        expect(saveButton()).toBeDisabled();
    });

    it('needs a reason', () => {
        renderDrawer(MAX_VENDORS);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: /Max vendors/ }), { target: { value: '1' } });
        expect(saveButton()).toBeDisabled();
        fireEvent.change(screen.getByRole('textbox', { name: /Reason/ }), { target: { value: '   ' } });
        expect(saveButton()).toBeDisabled();
    });

    it('picks vendor types with checkboxes', () => {
        renderDrawer(TYPES);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        expect(screen.getByRole('checkbox', { name: 'Planner' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Venue' })).not.toBeChecked();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Music' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Venue' }));
        giveReason();
        fireEvent.click(saveButton());
        expect(mutations.set.mock.calls[0][0]).toMatchObject({ configKey: 'allowedTypes', value: ['PLANNER', 'VENUE'] });
    });

    it('can allow no vendor types at all', () => {
        renderDrawer(TYPES);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Planner' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Music' }));
        giveReason();
        fireEvent.click(saveButton());
        expect(mutations.set.mock.calls[0][0]).toMatchObject({ value: [] });
    });

    it('sets storage in bytes', () => {
        renderDrawer(STORAGE);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        const amount = screen.getByRole('spinbutton');
        fireEvent.change(amount, { target: { value: '1' } });
        giveReason();
        fireEvent.click(saveButton());
        expect(mutations.set.mock.calls[0][0]).toMatchObject({ configKey: 'proStorageBytes', value: 1024 ** 3 });
    });

    it("starts from the event's own value and puts the plan's back with a reset", () => {
        renderDrawer({ ...MAX_VENDORS, effectiveValue: 1, override: { ...OVERRIDE, value: 1 } });
        expect(screen.getByRole('radio', { name: 'Set for this event' })).toBeChecked();
        expect(screen.getByRole('spinbutton', { name: /Max vendors/ })).toHaveValue(1);
        fireEvent.click(screen.getByRole('radio', { name: 'Follow the plan (5)' }));
        giveReason();
        fireEvent.click(saveButton());
        expect(mutations.reset).toHaveBeenCalledTimes(1);
        expect(mutations.reset.mock.calls[0][0]).toEqual({ moduleKey: 'vendors', configKey: 'maxVendors', reason: 'Only one vendor' });
        expect(mutations.set).not.toHaveBeenCalled();
    });

    it('has nothing to save when the same value is set again', () => {
        renderDrawer({ ...MAX_VENDORS, effectiveValue: 1, override: { ...OVERRIDE, value: 1 } });
        giveReason();
        expect(saveButton()).toBeDisabled();
    });

    it('warns that saving turns the module on when the event lacks it', () => {
        renderDrawer(MAX_VENDORS, false);
        expect(screen.queryByRole('status')).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: /Max vendors/ }), { target: { value: '1' } });
        expect(screen.getByRole('status')).toHaveTextContent("This turns Vendors on for this event only. The plan doesn't change.");
    });

    it('does not warn when the event already has the module', () => {
        renderDrawer(MAX_VENDORS, true);
        fireEvent.click(screen.getByRole('radio', { name: 'Set for this event' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: /Max vendors/ }), { target: { value: '1' } });
        expect(screen.queryByRole('status')).toBeNull();
    });
});
