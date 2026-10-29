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
        sampleTiles: [
            { key: 'reactions' as const, value: 57 },
            { key: 'comments' as const, value: 12 },
        ],
        partner: false,
        canApply: false,
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

    it('shows a non-partner their tiles and the partner numbers locked', () => {
        renderSection();
        expect(screen.getByText('Guests')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('Opened your details')).toBeInTheDocument();
        expect(screen.getByText('Views, reactions and comments')).toBeInTheDocument();
        expect(screen.getByText('For partners')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).toBeNull();
    });

    it('keeps the made-up sample away from assistive tech', () => {
        renderSection();
        expect(screen.getByText('57').closest('[aria-hidden="true"]')).not.toBeNull();
        expect(screen.getByText('1,234').closest('[aria-hidden="true"]')).toBeNull();
    });

    it('offers to become a partner while the prompt is on', () => {
        const props = renderSection({ canApply: true });
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
        expect(screen.queryByText('Views, reactions and comments')).toBeNull();
    });

    it('says when it failed', () => {
        renderSection({ loadFailed: true, tiles: [] });
        expect(screen.getByText("Couldn't load your reach.")).toBeInTheDocument();
    });
});
