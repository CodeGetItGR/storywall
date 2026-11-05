import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignSetLinkRow } from '@/components/admin/discountCampaigns/CampaignSetLinkRow';
import type { CampaignRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const LONG_NAME = 'Black Friday campaign with a very long name that would not fit on one line - Instagram story';

const row = {
    utmSource: 'instagram',
    utmMedium: 'social',
    utmCampaign: 'bf-story-el',
    visits: 3,
    sales: 2,
    salesRevenueMinorByCurrency: { EUR: 9800 },
    link: {
        id: 'l1',
        name: LONG_NAME,
        destinationPath: '/el',
        destinationAnchor: 'pricing',
        linkGroup: 'bf',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'bf-story-el',
        createdAt: '2026-11-01T00:00:00Z',
        shortCode: 'instagram-organic-bf-story-el',
    },
} as unknown as CampaignRowDto;

function renderRow() {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
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

    it('copies the short address', async () => {
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: `Copy link ${LONG_NAME}` }));

        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        const url = writeText.mock.calls[0][0] as string;
        expect(url).toBe('https://www.storywall.gr/c/instagram-organic-bf-story-el');
    });

    it('shows its sales and what they paid', () => {
        renderRow();

        const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
        expect(cells.slice(1, 4)).toEqual(['3', '2', '€98.00']);
    });

    it('wraps a long name instead of cutting it off', () => {
        renderRow();

        const name = screen.getByText(LONG_NAME);
        expect(name).not.toHaveClass('truncate');
        expect(name.closest('td')).not.toHaveClass('max-w-0');
    });
});
