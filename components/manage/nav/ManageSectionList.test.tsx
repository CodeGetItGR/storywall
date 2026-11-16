// components/manage/nav/ManageSectionList.test.tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import type { ManageNavGroup } from '@/lib/manageSections';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useManageSectionLabel', () => ({ useManageSectionLabel: () => (key: string) => `label:${key}` }));

afterEach(cleanup);

const groups: ManageNavGroup[] = [
    { key: 'event', items: ['overview', 'settings', 'billing'] },
    { key: 'people', items: ['rsvp', 'invitationsQr'] },
];

function renderList(props: Partial<Parameters<typeof ManageSectionList>[0]> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ManageSectionList eventId="e1" groups={groups} showDanger {...props} />
        </NextIntlClientProvider>,
    );
}

describe('ManageSectionList', () => {
    it('lists every entry but the Overview itself, by group, Danger zone last', () => {
        renderList();
        const event = screen.getByRole('group', { name: messages.ManagePage.navGroups.event });
        expect(within(event).getAllByRole('link').map((link) => link.textContent)).toEqual(['label:settings', 'label:billing']);
        expect(screen.getAllByRole('link').at(-1)).toHaveTextContent('label:danger');
    });

    it('drops a group whose only entry is the Overview', () => {
        renderList({ groups: [{ key: 'event', items: ['overview'] }], showDanger: false });
        expect(screen.queryByRole('group')).toBeNull();
    });

    it('opens a section in place', () => {
        const onSelectSection = vi.fn();
        renderList({ onSelectSection });
        fireEvent.click(screen.getByRole('link', { name: 'label:billing' }));
        expect(onSelectSection).toHaveBeenCalledWith('billing');
    });
});
