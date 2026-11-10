import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignDetailFixture, campaignListFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinksDrawer } from '@/components/admin/campaigns/CampaignLinksDrawer';
import { ApiError } from '@/lib/api/client';
import type { CampaignDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const writes = vi.hoisted(() => ({ add: vi.fn(), move: vi.fn(), remove: vi.fn() }));
vi.mock('@/hooks/useAdminCampaignApi', async () => ({
    ...(await import('@/components/admin/campaigns/__fixtures__/campaignWrites')).idleCampaignWrites(),
    useAddCampaignLinks: () => ({ mutateAsync: writes.add, isPending: false }),
    useMoveCampaignLink: () => ({ mutateAsync: writes.move, isPending: false }),
    useDeleteCampaignLink: () => ({ mutateAsync: writes.remove, isPending: false }),
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ open, title, children, footer }: { open: boolean; title: ReactNode; children: ReactNode; footer: ReactNode }) =>
        open ? (
            <div>
                <h2>{title}</h2>
                {children}
                {footer}
            </div>
        ) : null,
}));
vi.mock('@/components/ui/ConfirmActionModal', () => ({
    ConfirmActionModal: ({
        open,
        title,
        confirmLabel,
        onConfirmAction,
    }: {
        open: boolean;
        title: string;
        confirmLabel: string;
        onConfirmAction: () => void;
    }) =>
        open ? (
            <div role="dialog" aria-label={title}>
                <button type="button" onClick={onConfirmAction}>
                    {confirmLabel}
                </button>
            </div>
        ) : null,
}));

const LINKS = campaignDetailFixture.links.map((stats) => stats.link);
const OTHERS = campaignListFixture.items.map((item) => item.campaign).filter((campaign) => campaign.id !== 'launch');

function renderDrawer(campaign: CampaignDto = campaignDetailFixture.campaign) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignLinksDrawer open campaign={campaign} links={LINKS} others={OTHERS} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
}

describe('CampaignLinksDrawer', () => {
    beforeEach(() => {
        for (const write of Object.values(writes)) write.mockReset();
    });
    afterEach(cleanup);

    it('lists each link by what it is, never by its stored name, with a copy button named the same', () => {
        renderDrawer();

        expect(screen.getByRole('button', { name: 'Instagram Story ad EL' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Partner acme EL' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy link Facebook Post EL' })).toBeInTheDocument();
        expect(screen.queryByText('Facebook post · EL')).not.toBeInTheDocument();
    });

    it('opens a link to share it, and moves it to another campaign', async () => {
        writes.move.mockResolvedValue({});
        renderDrawer();

        fireEvent.click(screen.getByRole('button', { name: 'Facebook Post EL' }));

        expect(screen.getByText('https://www.storywall.gr/c/fb-post-el')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('combobox', { name: 'Campaign' }), { target: { value: 'spring' } });
        fireEvent.click(screen.getByRole('button', { name: 'Move' }));

        await waitFor(() => expect(writes.move).toHaveBeenCalledWith({ id: 'fb-post-el', campaignId: 'spring' }));
        expect(await screen.findByRole('button', { name: 'Add links' })).toBeInTheDocument();
    });

    it("shows why a link can't move out of a campaign with a discount", async () => {
        writes.move.mockRejectedValue(new ApiError(409, { status: 409, errorCode: 5225 }));
        renderDrawer();

        fireEvent.click(screen.getByRole('button', { name: 'Facebook Post EL' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move' }));

        expect(await screen.findByRole('alert')).toHaveTextContent("Links can't move into or out of a campaign with a discount.");
    });

    it("doesn't add links to an archived or ended campaign", () => {
        renderDrawer({ ...campaignDetailFixture.campaign, status: 'ARCHIVED', archivedAt: '2026-07-01T09:00:00Z' });
        expect(screen.getByRole('button', { name: 'Add links' })).toBeDisabled();
        cleanup();

        renderDrawer({ ...campaignDetailFixture.campaign, status: 'ENDED' });
        expect(screen.getByRole('button', { name: 'Add links' })).toBeDisabled();
    });

    it('asks before deleting a link', async () => {
        writes.remove.mockResolvedValue(undefined);
        renderDrawer();

        fireEvent.click(screen.getByRole('button', { name: 'Email or newsletter EL' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete link' }));
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete this link?' })).getByRole('button', { name: 'Delete' }));

        await waitFor(() => expect(writes.remove).toHaveBeenCalledWith('email-el'));
    });

    it('adds links, showing the placements the campaign already has as added', async () => {
        writes.add.mockResolvedValue([]);
        renderDrawer();

        fireEvent.click(screen.getByRole('button', { name: 'Add links' }));

        const added = screen.getByRole('checkbox', { name: 'Instagram Post · Already added' });
        expect(added).toBeChecked();
        expect(added).toBeDisabled();

        fireEvent.click(screen.getByRole('checkbox', { name: 'TikTok Post' }));
        fireEvent.submit(screen.getByRole('checkbox', { name: 'TikTok Post' }).closest('form') as HTMLFormElement);

        await waitFor(() =>
            expect(writes.add).toHaveBeenCalledWith({
                id: 'launch',
                input: expect.objectContaining({ placements: ['TIKTOK_POST'], languages: ['el', 'en'] }),
            }),
        );
    });
});
