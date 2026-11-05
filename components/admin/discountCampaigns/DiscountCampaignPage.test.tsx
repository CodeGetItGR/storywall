import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignPage } from '@/components/admin/discountCampaigns/DiscountCampaignPage';
import type { AdminDiscountCampaignDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/components/ui/BackButton', () => ({
    BackButton: ({ href, label }: { href: string; label: string }) => <a href={href}>{label}</a>,
}));

const idle = { isPending: false, mutateAsync: vi.fn() };
vi.mock('@/hooks/useAdminDiscountCampaigns', () => ({
    useCreateDiscountCampaign: () => idle,
    useUpdateDiscountCampaign: () => idle,
    useStopDiscountCampaign: () => idle,
    useDeleteDiscountCampaign: () => idle,
}));

vi.mock('@/hooks/useAdminCampaigns', () => ({
    useAdminCampaigns: () => ({ data: [], isLoading: false, error: null }),
    useGenerateCampaignLinkSet: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const campaign = (status: AdminDiscountCampaignDto['status']): AdminDiscountCampaignDto => ({
    id: 'c1',
    name: 'Black Friday',
    percent: 20,
    label: null,
    linkName: 'black-friday',
    startsAt: '2026-11-28T00:00:00Z',
    endsAt: '2026-11-30T00:00:00Z',
    status,
    createdAt: '2026-11-01T00:00:00Z',
});

function renderPage(value: AdminDiscountCampaignDto | null) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignPage campaign={value} onBackAction={vi.fn()} onDoneAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
}

describe('DiscountCampaignPage', () => {
    afterEach(cleanup);

    it("goes back to the list and shows the campaign's name", () => {
        renderPage(campaign('LIVE'));

        expect(screen.getByRole('link', { name: 'All discount campaigns' })).toHaveAttribute('href', '#discount-campaigns');
        expect(screen.getByRole('heading', { level: 2, name: 'Black Friday' })).toBeInTheDocument();
    });

    it('lets a new campaign pick its link name', () => {
        renderPage(null);

        expect(screen.getByRole('textbox', { name: 'Link name' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Stop campaign' })).not.toBeInTheDocument();
    });

    it('offers Stop on a live campaign, with the link name fixed', () => {
        renderPage(campaign('LIVE'));

        expect(screen.getByRole('button', { name: 'Stop campaign' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Delete campaign' })).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Link name' })).toBeDisabled();
    });

    it('offers Delete on a scheduled campaign', () => {
        renderPage(campaign('SCHEDULED'));

        expect(screen.getByRole('button', { name: 'Delete campaign' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Stop campaign' })).not.toBeInTheDocument();
    });

    it('is read only once ended', () => {
        renderPage(campaign('ENDED'));

        expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: messages.AdminPage.save })).not.toBeInTheDocument();
    });

    it('does not let a start date without a time through', () => {
        renderPage(null);
        const startDate = document.querySelectorAll<HTMLInputElement>('input[type="date"]')[0];
        const startTime = document.querySelectorAll<HTMLInputElement>('input[type="time"]')[0];

        expect(startTime).not.toBeRequired();
        fireEvent.change(startDate, { target: { value: '2026-11-10' } });

        expect(startTime).toBeRequired();
        expect(startTime).toBeInvalid();
    });

    it('announces a save error', async () => {
        idle.mutateAsync.mockRejectedValueOnce(new Error('save failed'));
        renderPage(campaign('SCHEDULED'));

        fireEvent.click(screen.getByRole('button', { name: messages.AdminPage.save }));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
    });

    it('shows the links section for a saved campaign', () => {
        renderPage(campaign('LIVE'));

        expect(screen.getByRole('heading', { name: 'Links' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'English links' })).toBeInTheDocument();
    });

    it('shows no links section for a new campaign', () => {
        renderPage(null);

        expect(screen.queryByRole('heading', { name: 'Links' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'English links' })).not.toBeInTheDocument();
    });
});
