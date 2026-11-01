import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventLimitPreview } from '@/components/admin/events/EventLimitPreview';
import { EventModuleConfigItem } from '@/components/admin/events/EventModuleConfigItem';
import type { AdminEventModuleConfig } from '@/lib/api/types';
import messages from '@/messages/en.json';

const OVERRIDE = { extra: null, enabled: null, value: ['PLANNER'], reason: 'Asked', setByUserId: 'a-1', setAt: '2026-10-01T10:00:00Z' };
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
    effectiveValue: ['PLANNER'],
    override: OVERRIDE,
};

function withIntl(node: React.ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('EventModuleConfigItem', () => {
    it('shows a number as a mono token beside its label', () => {
        withIntl(<EventModuleConfigItem config={MAX_VENDORS} editable={false} onEditAction={vi.fn()} />);
        const value = screen.getByText('5');
        expect(value.className).toContain('font-mono');
        expect(value.className).not.toContain('w-full');
        expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    });

    it('puts a list of types on its own line in plain text', () => {
        const onEdit = vi.fn();
        withIntl(<EventModuleConfigItem config={TYPES} editable onEditAction={onEdit} />);
        const value = screen.getByText('Planner');
        expect(value.className).toContain('w-full');
        expect(value.className).not.toContain('font-mono');
        expect(screen.getByText('Admin')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEdit).toHaveBeenCalledWith('vendors', 'allowedTypes');
    });
});

describe('EventLimitPreview', () => {
    it('shows now and after as two rows for a list', () => {
        const { container } = withIntl(<EventLimitPreview current="Planner, Music" next="Planner" breakdown={null} warning={null} list />);
        expect(container.querySelector('dl')).not.toBeNull();
        expect(screen.getByText('Planner, Music')).toBeTruthy();
        expect(screen.getByText('Planner')).toBeTruthy();
    });

    it('shows now and after side by side for a number', () => {
        const { container } = withIntl(<EventLimitPreview current="5" next="1" breakdown={null} warning={null} />);
        expect(container.querySelector('dl')).toBeNull();
        expect(screen.getByText('1').className).toContain('font-mono');
    });
});
