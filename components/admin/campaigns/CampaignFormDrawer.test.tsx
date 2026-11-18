import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { campaignFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignFormDrawer } from '@/components/admin/campaigns/CampaignFormDrawer';
import type { CampaignDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const writes = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), archive: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useAdminCampaignApi', async () => ({
    ...(await import('@/components/admin/campaigns/__fixtures__/campaignWrites')).idleCampaignWrites(),
    useCreateCampaign: () => ({ mutateAsync: writes.create, isPending: false }),
    useUpdateCampaign: () => ({ mutateAsync: writes.update, isPending: false }),
    useArchiveCampaign: () => ({ mutateAsync: writes.archive, isPending: false }),
    useStopCampaignDiscount: () => ({ mutateAsync: writes.stop, isPending: false }),
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

function renderDrawer({
    campaign = null,
    canEditDiscount = true,
    deletable = false,
}: { campaign?: CampaignDto | null; canEditDiscount?: boolean; deletable?: boolean } = {}) {
    const actions = { onClose: vi.fn(), onCreated: vi.fn(), onDeleted: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignFormDrawer
                open
                campaign={campaign}
                links={[]}
                deletable={deletable}
                canEditDiscount={canEditDiscount}
                onCloseAction={actions.onClose}
                onCreatedAction={actions.onCreated}
                onDeletedAction={actions.onDeleted}
            />
        </NextIntlClientProvider>,
    );
    return actions;
}

function type(name: string, value: string) {
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
}

function submit() {
    fireEvent.submit(screen.getByRole('textbox', { name: 'Name' }).closest('form') as HTMLFormElement);
}

describe('CampaignFormDrawer', () => {
    beforeEach(() => {
        for (const write of Object.values(writes)) write.mockReset();
    });
    afterEach(cleanup);

    it('suggests the link name from the name until it is edited by hand', () => {
        renderDrawer();

        type('Name', 'Καλοκαίρι 2026');
        expect(screen.getByRole('textbox', { name: 'Link name' })).toHaveValue('kalokairi-2026');

        type('Link name', 'summer');
        type('Name', 'Summer 2026');
        expect(screen.getByRole('textbox', { name: 'Link name' })).toHaveValue('summer');
    });

    it('creates the campaign with the ticked links, then opens it', async () => {
        writes.create.mockResolvedValue(campaignFixture({ id: 'c-new' }));
        const actions = renderDrawer();

        type('Name', 'Autumn');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Instagram Post' }));
        submit();

        await waitFor(() => expect(actions.onCreated).toHaveBeenCalledWith('c-new'));
        expect(writes.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Autumn',
                linkName: 'autumn',
                discount: null,
                links: expect.objectContaining({ placements: ['INSTAGRAM_POST'], languages: ['el', 'en'] }),
            }),
        );
    });

    it("doesn't create while a ticked Partner has no name", () => {
        renderDrawer();

        type('Name', 'Autumn');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Partner' }));
        submit();

        expect(screen.getByText("Add the partner's name.")).toBeInTheDocument();
        expect(writes.create).not.toHaveBeenCalled();
    });

    it("leaves a saved campaign's links to the links drawer", () => {
        renderDrawer({ campaign: campaignFixture() });

        expect(screen.getByRole('heading', { name: 'Edit campaign' })).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'Instagram Post' })).not.toBeInTheDocument();
    });

    it("doesn't let marketing change the discount", () => {
        renderDrawer({ campaign: campaignFixture(), canEditDiscount: false });

        expect(screen.getByRole('switch', { name: 'Discount' })).toBeDisabled();
        expect(screen.getByRole('spinbutton', { name: 'Discount %' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Stop discount' })).not.toBeInTheDocument();
    });

    it("doesn't let a discount be added to an archived campaign", () => {
        renderDrawer({ campaign: campaignFixture({ status: 'ARCHIVED', discount: null, archivedAt: '2026-07-01T09:00:00Z' }) });

        expect(screen.getByRole('switch', { name: 'Discount' })).toBeDisabled();
    });

    it('asks before stopping a running discount', async () => {
        writes.stop.mockResolvedValue(campaignFixture());
        const actions = renderDrawer({ campaign: campaignFixture() });

        fireEvent.click(screen.getByRole('button', { name: 'Stop discount' }));
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Stop this discount?' })).getByRole('button', { name: 'Stop discount' }));

        await waitFor(() => expect(actions.onClose).toHaveBeenCalled());
        expect(writes.stop).toHaveBeenCalledWith('launch');
    });

    it('archives an ended campaign after asking, and keeps a running one from being archived', async () => {
        writes.archive.mockResolvedValue(campaignFixture({ status: 'ARCHIVED' }));
        renderDrawer({ campaign: campaignFixture() });
        expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
        cleanup();

        const actions = renderDrawer({ campaign: campaignFixture({ status: 'ENDED', discount: null }) });
        fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Archive this campaign?' })).getByRole('button', { name: 'Archive' }));

        await waitFor(() => expect(actions.onClose).toHaveBeenCalled());
        expect(writes.archive).toHaveBeenCalledWith('launch');
    });

    it('offers Delete only for a campaign Spring says can go', () => {
        renderDrawer({ campaign: campaignFixture({ discount: null }) });
        expect(screen.queryByRole('button', { name: 'Delete campaign' })).not.toBeInTheDocument();
        cleanup();

        renderDrawer({ campaign: campaignFixture({ discount: null }), deletable: true });
        expect(screen.getByRole('button', { name: 'Delete campaign' })).toBeInTheDocument();
    });
});
