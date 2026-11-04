import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const row = (id: string, linkGroup: string | null, visits: number, sales = 0, salesRevenueMinorByCurrency: Record<string, number> = {}) =>
    ({
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: `${id}-post-el`,
        visits,
        sales,
        salesRevenueMinorByCurrency,
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

function renderLinks(status?: AdminDiscountCampaignDto['status']) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignLinks campaign={{ ...campaign, status } as AdminDiscountCampaignDto} />
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

    it('totals the links', () => {
        rows = [row('a', 'bf', 12, 2, { EUR: 9_800 }), row('b', 'bf', 3, 1, { EUR: 4_900 })];
        renderLinks();

        const total = screen.getByRole('row', { name: /Total/ });
        expect(within(total).getByText('15')).toBeInTheDocument();
        expect(within(total).getByText('3')).toBeInTheDocument();
        expect(within(total).getByText(/147/)).toBeInTheDocument();
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

    describe.each(['ENDED', 'OFF'] as const)('on a %s campaign', (status) => {
        const OVER = "This campaign is over. Don't use these links any more.";

        it('hides the create buttons and warns above the listed links', () => {
            rows = [row('a', 'bf', 12)];
            renderLinks(status);

            expect(screen.queryByRole('button', { name: 'English links' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Greek links' })).not.toBeInTheDocument();
            const warning = screen.getByText(OVER);
            expect(warning).toHaveClass('text-status-warn');
            expect(warning.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(screen.getByText('Link a')).toBeInTheDocument();
        });

        it('shows no warning when no link is listed', () => {
            rows = [row('b', 'other', 1)];
            renderLinks(status);

            expect(screen.queryByText(OVER)).not.toBeInTheDocument();
        });

        it('still copies a listed link', async () => {
            const writeText = vi.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
            rows = [row('a', 'bf', 12)];
            renderLinks(status);

            fireEvent.click(screen.getByRole('button', { name: 'Copy link Link a' }));

            await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        });
    });

    it.each(['LIVE', 'SCHEDULED'] as const)('keeps the buttons and shows no warning on a %s campaign', (status) => {
        rows = [row('a', 'bf', 12)];
        renderLinks(status);

        expect(screen.getByRole('button', { name: 'English links' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Greek links' })).toBeInTheDocument();
        expect(screen.queryByText(/This campaign is over/)).not.toBeInTheDocument();
    });
});
