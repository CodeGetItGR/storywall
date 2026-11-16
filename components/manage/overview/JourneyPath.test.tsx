import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JourneyPath } from '@/components/manage/overview/JourneyPath';
import type { JourneyStopModel } from '@/lib/eventJourney';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const stops: JourneyStopModel[] = [
    { key: 'details', title: 'Event details', icon: 'details', status: 'done', href: '/settings' },
    {
        key: 'schedule',
        title: 'Schedule',
        icon: 'schedule',
        status: 'current',
        href: '/schedule',
        card: { body: 'Add the parts of your day', action: { label: 'Add sessions', href: '/schedule' } },
    },
    { key: 'gift', title: 'Gift account', icon: 'gift', status: 'upcoming', href: '/gifts', detail: 'Add gift account' },
];

afterEach(cleanup);

describe('JourneyPath', () => {
    it('lists the stops in order under the journey label (small screens)', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const list = within(screen.getByTestId('journey-mobile')).getByRole('list', { name: 'Get ready' });
        expect(
            within(list)
                .getAllByRole('listitem')
                .map((item) => item.textContent),
        ).toEqual([expect.stringContaining('Event details'), expect.stringContaining('Schedule'), expect.stringContaining('Gift account')]);
    });

    it("shows the current stop's card with its action", () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getByText('Add the parts of your day')).toBeInTheDocument();
        expect(within(mobile).getByRole('link', { name: 'Add sessions' })).toHaveAttribute('href', '/schedule');
    });

    it('labels done stops and gives stop images their label as alt text', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getAllByText('journey.phases.done')).toHaveLength(1);
        expect(within(mobile).getByAltText('Gift account')).toBeInTheDocument();
        expect(within(mobile).getByAltText('On the day')).toBeInTheDocument();
    });

    it('swaps the current card for a given replacement (All set)', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" replacementCard={<p>All set card</p>} />);
        expect(within(screen.getByTestId('journey-mobile')).getByText('All set card')).toBeInTheDocument();
        expect(within(screen.getByTestId('journey-mobile')).queryByText('Add the parts of your day')).toBeNull();
    });
});
