// components/manage/nav/ManageSidebar.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import type { ManageNavGroup } from '@/lib/manageSections';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));

afterEach(cleanup);

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings'] },
    { key: 'people', items: ['rsvp', 'vendors'] },
];

function renderSidebar(props: Partial<Parameters<typeof ManageSidebar>[0]> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSidebar eventId="e1" groups={groups} showDanger active="settings" {...props} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSidebar', () => {
    it('lists each entry under its group heading, Danger zone last', () => {
        renderSidebar();
        const event = screen.getByRole('group', { name: messages.ManagePage.navGroups.event });
        expect(within(event).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:overview', 'label:settings']);
        const people = screen.getByRole('group', { name: messages.ManagePage.navGroups.people });
        expect(within(people).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:rsvp', 'label:vendors']);
        expect(screen.getAllByRole('link').at(-1)).toHaveTextContent('label:danger');
    });

    it('marks the open entry', () => {
        renderSidebar();
        expect(screen.getByRole('link', { name: 'label:settings' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'label:overview' })).not.toHaveAttribute('aria-current');
    });

    it('leaves Danger zone out when the host may not delete', () => {
        renderSidebar({ showDanger: false });
        expect(screen.queryByRole('link', { name: 'label:danger' })).toBeNull();
    });
});
