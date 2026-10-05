import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Image, Settings } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextMenuTab } from './ContextMenuTab';

const mocks = vi.hoisted(() => ({ prefetch: vi.fn(), onItemClick: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch: mocks.prefetch }) }));

const items = [
    { key: 'manage', href: '/events/e1/manage', icon: Settings, label: 'Manage' },
    { key: 'gallery', href: '/events/e1/tools/gallery', icon: Image, label: 'Gallery' },
];

function renderMenu() {
    render(
        <ContextMenuTab active={false} items={items} label="Event menu" pathname="/events/e1/feed" searchParams="" onItemClick={mocks.onItemClick} />,
    );
}

describe('ContextMenuTab', () => {
    beforeEach(() => mocks.prefetch.mockReset());
    afterEach(cleanup);

    it("doesn't prefetch while closed", () => {
        renderMenu();

        expect(mocks.prefetch).not.toHaveBeenCalled();
    });

    it("prefetches every item's page when it opens", async () => {
        renderMenu();

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Event menu' })));

        expect(await screen.findByText('Gallery')).toBeInTheDocument();
        expect(mocks.prefetch.mock.calls).toEqual([['/events/e1/manage'], ['/events/e1/tools/gallery']]);
    });

    it('marks only the most specific matching item active', async () => {
        const nested = [
            { key: 'manage', href: '/events/e1/manage', icon: Settings, label: 'Manage' },
            { key: 'invitationsQr', href: '/events/e1/manage/qr', icon: Image, label: 'Share links' },
        ];
        render(
            <ContextMenuTab
                active
                items={nested}
                label="Event menu"
                pathname="/events/e1/manage/qr"
                searchParams=""
                onItemClick={mocks.onItemClick}
            />,
        );

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Event menu' })));

        expect((await screen.findByText('Share links')).closest('[role="menuitem"]')).toHaveClass('bg-surface-muted');
        expect(screen.getByText('Manage').closest('[role="menuitem"]')).not.toHaveClass('bg-surface-muted');
    });
});
