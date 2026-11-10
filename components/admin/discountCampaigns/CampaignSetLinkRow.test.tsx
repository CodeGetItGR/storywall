import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignSetLinkRow } from '@/components/admin/discountCampaigns/CampaignSetLinkRow';
import type { CampaignRowDto } from '@/lib/api/types';
import elMessages from '@/messages/el.json';
import enMessages from '@/messages/en.json';

const FULL_NAME = 'Black Friday · Instagram story · EL';

function rowOf(link: Partial<NonNullable<CampaignRowDto['link']>> = {}) {
    return {
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'bf-story-el',
        visits: 3,
        sales: 2,
        salesRevenueMinorByCurrency: { EUR: 9800 },
        link: {
            id: 'l1',
            name: FULL_NAME,
            destinationPath: '/el',
            destinationAnchor: 'pricing',
            linkGroup: 'bf',
            utmSource: 'instagram',
            utmMedium: 'social',
            utmCampaign: 'bf-story-el',
            createdAt: '2026-11-01T00:00:00Z',
            shortCode: 'instagram-organic-bf-story-el',
            campaignId: 'campaign-1',
            ...link,
        },
    } as unknown as CampaignRowDto;
}

function renderRow(row: CampaignRowDto = rowOf(), locale: 'en' | 'el' = 'en') {
    render(
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : elMessages} timeZone="UTC">
            <table>
                <tbody>
                    <CampaignSetLinkRow row={row} />
                </tbody>
            </table>
        </NextIntlClientProvider>,
    );
}

describe('CampaignSetLinkRow', () => {
    const writeText = vi.fn();

    beforeEach(() => {
        writeText.mockReset();
        writeText.mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    });

    afterEach(cleanup);

    it('shows only the placement, with the full name for screen readers', () => {
        renderRow();

        const label = screen.getByText('Story');
        expect(label).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByText(FULL_NAME)).toHaveClass('sr-only');
    });

    it('says the placement in Greek', () => {
        renderRow(rowOf({ utmCampaign: 'bf-post-el' }), 'el');

        expect(screen.getByText('Ανάρτηση')).toBeInTheDocument();
    });

    it('calls a Google ad Google', () => {
        renderRow(rowOf({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'bf-search-el' }));

        expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('copies the short address', async () => {
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: `Copy link ${FULL_NAME}` }));

        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        expect(writeText.mock.calls[0][0]).toBe('https://www.storywall.gr/c/instagram-organic-bf-story-el');
    });

    it('copies the full address of a Google ad', async () => {
        renderRow(rowOf({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'bf-search-el', shortCode: 'google-paid-bf-search-el' }));

        fireEvent.click(screen.getByRole('button', { name: `Copy link ${FULL_NAME}` }));

        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        expect(writeText.mock.calls[0][0]).toBe(
            'https://www.storywall.gr/el?utm_source=google&utm_medium=cpc&utm_campaign=bf-search-el#pricing',
        );
    });

    it('shows its sales and what they paid', () => {
        renderRow();

        const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
        expect(cells.slice(1, 4)).toEqual(['3', '2', '€98.00']);
    });

    it('falls back to a wrapping name for a link outside the set pattern', () => {
        const longName = 'A hand-made link with a very long name that would not fit on one line';
        renderRow(rowOf({ name: longName, utmCampaign: 'october-bio' }));

        const name = screen.getByText(longName);
        expect(name).not.toHaveClass('truncate');
        expect(name).not.toHaveClass('sr-only');
        expect(name.closest('td')).not.toHaveClass('max-w-0');
    });
});
