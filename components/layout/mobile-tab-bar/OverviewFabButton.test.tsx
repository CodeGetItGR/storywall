import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OverviewFabButton } from '@/components/layout/mobile-tab-bar/OverviewFabButton';

afterEach(cleanup);

const base = { href: '/events/e1/manage', label: 'Overview', raised: false, hidden: false };

describe('OverviewFabButton', () => {
    it('links to the Overview with its label', () => {
        render(<OverviewFabButton {...base} count={3} />);
        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/events/e1/manage');
    });

    it('shows the count as a badge hidden from screen readers', () => {
        render(<OverviewFabButton {...base} count={3} />);
        expect(screen.getByTestId('overview-fab-badge')).toHaveTextContent('3');
        expect(screen.getByTestId('overview-fab-badge')).toHaveAttribute('aria-hidden', 'true');
    });

    it.each([0, null])('shows no badge for %s', (count) => {
        render(<OverviewFabButton {...base} count={count} />);
        expect(screen.queryByTestId('overview-fab-badge')).toBeNull();
    });

    it('marks itself hidden', () => {
        render(<OverviewFabButton {...base} count={1} hidden />);
        expect(screen.getByRole('link', { hidden: true })).toHaveAttribute('data-hidden');
    });
});
