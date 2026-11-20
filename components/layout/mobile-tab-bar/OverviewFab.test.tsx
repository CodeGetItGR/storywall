import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OverviewFab } from '@/components/layout/mobile-tab-bar/OverviewFab';
import messages from '@/messages/en.json';

afterEach(cleanup);

const state: { event: { id: string } | null } = { event: { id: 'e1' } };
vi.mock('@/hooks/useOverviewFabEvent', () => ({ useOverviewFabEvent: () => state.event }));
vi.mock('@/hooks/useJourneyStepsLeft', () => ({ useJourneyStepsLeft: () => 2 }));

function renderWithIntl(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {node}
        </NextIntlClientProvider>,
    );
}

describe('OverviewFab', () => {
    it('renders the button with the count when the hook gives an event', () => {
        renderWithIntl(<OverviewFab raised={false} hidden={false} />);
        expect(screen.getByRole('link', { name: messages.ManagePage.sections.overview })).toHaveAttribute('href', '/events/e1/manage');
        expect(screen.getByTestId('overview-fab-badge')).toHaveTextContent('2');
    });

    it('renders nothing when there is no event', () => {
        state.event = null;
        const { container } = renderWithIntl(<OverviewFab raised={false} hidden={false} />);
        expect(container).toBeEmptyDOMElement();
    });
});
