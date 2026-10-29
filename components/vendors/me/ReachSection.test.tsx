import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReachSection } from '@/components/vendors/me/ReachSection';
import messages from '@/messages/en.json';

function renderSection(overrides: Partial<Parameters<typeof ReachSection>[0]> = {}) {
    const props = {
        tiles: [
            { key: 'guests' as const, value: 1234 },
            { key: 'listTaps' as const, value: 8 },
        ],
        partner: false,
        showPartnerAction: false,
        isLoading: false,
        loadFailed: false,
        onBecomePartnerAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <ReachSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('ReachSection', () => {
    afterEach(cleanup);

    it('shows a non-partner two tiles and the partner line', () => {
        renderSection();
        expect(screen.getByText('Guests')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('Opened your details')).toBeInTheDocument();
        expect(screen.getByText('Partners see the full report.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).toBeNull();
    });

    it('offers to become a partner while the prompt is on', () => {
        const props = renderSection({ showPartnerAction: true });
        fireEvent.click(screen.getByRole('button', { name: 'Become a partner' }));
        expect(props.onBecomePartnerAction).toHaveBeenCalled();
    });

    it('shows a partner every tile and no line', () => {
        renderSection({
            partner: true,
            tiles: [
                { key: 'guests', value: 120 },
                { key: 'proViewers', value: 64 },
                { key: 'reactions', value: 33 },
            ],
        });
        expect(screen.getByText('Saw your photos and videos')).toBeInTheDocument();
        expect(screen.queryByText('Partners see the full report.')).toBeNull();
    });

    it('says when it failed', () => {
        renderSection({ loadFailed: true, tiles: [] });
        expect(screen.getByText("Couldn't load your reach.")).toBeInTheDocument();
    });
});
