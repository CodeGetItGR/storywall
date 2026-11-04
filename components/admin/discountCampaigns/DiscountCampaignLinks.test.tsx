import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignLinks } from '@/components/admin/discountCampaigns/DiscountCampaignLinks';
import { ApiError } from '@/lib/api/client';
import type { AdminDiscountCampaignDto, CampaignRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const mutateAsync = vi.fn();
let rows: CampaignRowDto[] = [];
let isPending = false;

vi.mock('@/hooks/useAdminCampaigns', () => ({
    useAdminCampaigns: () => ({ data: rows, isLoading: false, error: null }),
    useGenerateCampaignLinkSet: () => ({ mutateAsync, isPending }),
}));

const campaign = { id: 'c1', name: 'Black Friday', linkName: 'bf' } as AdminDiscountCampaignDto;

const row = (id: string, linkGroup: string | null, visits: number) =>
    ({
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: `${id}-post-el`,
        visits,
        link: {
            id,
            name: `Link ${id}`,
            destinationPath: '/el',
            destinationAnchor: 'pricing',
            linkGroup,
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: `${id}-post-el`,
            createdAt: '2026-11-01T00:00:00Z',
        },
    }) as CampaignRowDto;

function renderLinks() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignLinks campaign={campaign} />
        </NextIntlClientProvider>,
    );
}

describe('DiscountCampaignLinks', () => {
    beforeEach(() => {
        rows = [];
        isPending = false;
        mutateAsync.mockReset();
        mutateAsync.mockResolvedValue({ links: [], created: 8 });
    });

    afterEach(cleanup);

    it("lists only this campaign's links, with their visits", () => {
        rows = [row('a', 'bf', 12), row('b', 'other', 99), row('c', null, 7)];
        renderLinks();

        expect(screen.getByText('Link a')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.queryByText('Link b')).not.toBeInTheDocument();
        expect(screen.queryByText('Link c')).not.toBeInTheDocument();
    });

    it('creates a set for the language of the button', async () => {
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'English links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'en' });
        await act(async () => undefined);

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'el' });
    });

    it('disables both buttons while a set is being created', () => {
        isPending = true;
        renderLinks();

        expect(screen.getByRole('button', { name: 'English links' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Greek links' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'English links' }));
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('shows an invalid campaign name through the admin error message', async () => {
        mutateAsync.mockRejectedValue(new ApiError(400, { status: 400, errorCode: 3122 }));
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));

        expect(await screen.findByText("Check the campaign's details.")).toBeInTheDocument();
    });

    it('clears the error on the next click', async () => {
        mutateAsync.mockRejectedValueOnce(new ApiError(400, { status: 400, errorCode: 3122 }));
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        await screen.findByText("Check the campaign's details.");

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        await waitFor(() => expect(screen.queryByText("Check the campaign's details.")).not.toBeInTheDocument());
    });
});
