import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscountCampaignLinks } from '@/components/admin/discountCampaigns/DiscountCampaignLinks';
import { ApiError } from '@/lib/api/client';
import type { AdminDiscountCampaignDto, CampaignRowDto } from '@/lib/api/types';
import { CAMPAIGN_SET_SIZE } from '@/lib/campaignLinks';
import messages from '@/messages/en.json';

const mutateAsync = vi.fn();
let rows: CampaignRowDto[] = [];
let isPending = false;

vi.mock('@/hooks/useAdminCampaigns', () => ({
    useAdminCampaigns: () => ({ data: rows, isLoading: false, error: null }),
    useGenerateCampaignLinkSet: () => ({ mutateAsync, isPending }),
}));

const campaign = { id: 'c1', name: 'Black Friday', linkName: 'bf' } as AdminDiscountCampaignDto;

const row = (
    id: string,
    linkGroup: string | null,
    visits: number,
    sales = 0,
    salesRevenueMinorByCurrency: Record<string, number> = {},
    language: 'en' | 'el' = 'el',
) =>
    ({
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: `${id}-post-${language}`,
        visits,
        sales,
        salesRevenueMinorByCurrency,
        link: {
            id,
            name: `Link ${id}`,
            destinationPath: language === 'el' ? '/el' : '/',
            destinationAnchor: 'pricing',
            linkGroup,
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: `${id}-post-${language}`,
            createdAt: '2026-11-01T00:00:00Z',
        },
    }) as CampaignRowDto;

function fullSet(language: 'en' | 'el') {
    return Array.from({ length: CAMPAIGN_SET_SIZE }, (_, index) => row(`${language}${index}`, 'bf', 1, 0, {}, language));
}

function renderLinks(status?: AdminDiscountCampaignDto['status']) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DiscountCampaignLinks campaign={{ ...campaign, status } as AdminDiscountCampaignDto} />
        </NextIntlClientProvider>,
    );
}

function copyButton(id: string) {
    return screen.queryByRole('button', { name: `Copy link Link ${id}` });
}

describe('DiscountCampaignLinks', () => {
    beforeEach(() => {
        rows = [];
        isPending = false;
        mutateAsync.mockReset();
        mutateAsync.mockResolvedValue({ links: [], created: CAMPAIGN_SET_SIZE });
    });

    afterEach(cleanup);

    it("lists only this campaign's links, with their visits", () => {
        rows = [row('a', 'bf', 12), row('b', 'other', 99), row('c', null, 7)];
        renderLinks();

        expect(copyButton('a')).toBeInTheDocument();
        expect(screen.getAllByText('12').length).toBeGreaterThan(0);
        expect(copyButton('b')).not.toBeInTheDocument();
        expect(copyButton('c')).not.toBeInTheDocument();
    });

    it('opens on the Greek links and switches to the English ones', () => {
        rows = [row('greek', 'bf', 1), row('english', 'bf', 2, 0, {}, 'en')];
        renderLinks();

        expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'EL' })).toHaveAttribute('aria-pressed', 'true');
        expect(copyButton('greek')).toBeInTheDocument();
        expect(copyButton('english')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'EN' }));

        expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
        expect(copyButton('english')).toBeInTheDocument();
        expect(copyButton('greek')).not.toBeInTheDocument();
    });

    it('totals only the chosen language', () => {
        rows = [
            row('a', 'bf', 12, 2, { EUR: 9_800 }),
            row('b', 'bf', 3, 1, { EUR: 4_900 }),
            row('c', 'bf', 100, 50, { EUR: 100_000 }, 'en'),
            row('d', 'bf', 100, 50, { EUR: 100_000 }, 'en'),
        ];
        renderLinks();

        const total = screen.getByRole('row', { name: /Total/ });
        expect(within(total).getByText('15')).toBeInTheDocument();
        expect(within(total).getByText('3')).toBeInTheDocument();
        expect(within(total).getByText(/147/)).toBeInTheDocument();
    });

    it('creates what the chosen language is missing', async () => {
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'el' });
        await act(async () => undefined);

        fireEvent.click(screen.getByRole('button', { name: 'EN' }));
        fireEvent.click(screen.getByRole('button', { name: 'English links' }));
        expect(mutateAsync).toHaveBeenCalledWith({ name: 'Black Friday', linkName: 'bf', language: 'en' });
    });

    it('offers the create button when a set has one link too few, such as a new placement', () => {
        rows = fullSet('el').slice(1);
        renderLinks();

        expect(screen.getByRole('button', { name: 'Greek links' })).toBeInTheDocument();
    });

    it('hides the create button once the language has its whole set', () => {
        rows = [...fullSet('el'), row('en0', 'bf', 1, 0, {}, 'en')];
        renderLinks();

        expect(screen.queryByRole('button', { name: 'Greek links' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'EN' }));
        expect(screen.getByRole('button', { name: 'English links' })).toBeInTheDocument();
    });

    it('disables the create button while a set is being created', () => {
        isPending = true;
        renderLinks();

        const create = screen.getByRole('button', { name: 'Greek links' });
        expect(create).toBeDisabled();

        fireEvent.click(create);
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

    it('clears the error when switching language', async () => {
        mutateAsync.mockRejectedValueOnce(new ApiError(400, { status: 400, errorCode: 3122 }));
        renderLinks();

        fireEvent.click(screen.getByRole('button', { name: 'Greek links' }));
        await screen.findByText("Check the campaign's details.");

        fireEvent.click(screen.getByRole('button', { name: 'EN' }));
        expect(screen.queryByText("Check the campaign's details.")).not.toBeInTheDocument();
    });

    describe.each(['ENDED', 'OFF'] as const)('on a %s campaign', (status) => {
        const OVER = "This campaign is over. Don't use these links any more.";

        it('hides the create button and warns above the listed links', () => {
            rows = [row('a', 'bf', 12)];
            renderLinks(status);

            expect(screen.queryByRole('button', { name: 'Greek links' })).not.toBeInTheDocument();
            const warning = screen.getByText(OVER);
            expect(warning).toHaveClass('text-status-warn');
            expect(warning.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(copyButton('a')).toBeInTheDocument();
        });

        it('shows no warning and no switcher when no link is listed', () => {
            rows = [row('b', 'other', 1)];
            renderLinks(status);

            expect(screen.queryByText(OVER)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'EL' })).not.toBeInTheDocument();
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

    it.each(['LIVE', 'SCHEDULED'] as const)('keeps the create button and shows no warning on a %s campaign', (status) => {
        rows = [row('a', 'bf', 12)];
        renderLinks(status);

        expect(screen.getByRole('button', { name: 'Greek links' })).toBeInTheDocument();
        expect(screen.queryByText(/This campaign is over/)).not.toBeInTheDocument();
    });
});
