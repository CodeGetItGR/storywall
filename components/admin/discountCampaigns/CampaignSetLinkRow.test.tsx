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
    },
} as CampaignRowDto;

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

    it('copies the link with its query first and its anchor last', async () => {
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: `Copy link ${LONG_NAME}` }));

        await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
        const url = writeText.mock.calls[0][0] as string;
        expect(url).toMatch(/\?utm_source=instagram&utm_medium=social&utm_campaign=bf-story-el#pricing$/);
    });

    it('wraps a long name instead of cutting it off', () => {
        renderRow();

        const name = screen.getByText(LONG_NAME);
        expect(name).not.toHaveClass('truncate');
        expect(name.closest('td')).not.toHaveClass('max-w-0');
    });
});
