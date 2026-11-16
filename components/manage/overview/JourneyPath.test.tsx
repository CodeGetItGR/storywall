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
        highlight: 'Add sessions',
        links: [],
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

    it("puts the current card in place of the stop's text on small screens, so the title shows once", () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getAllByText('Schedule')).toHaveLength(1);
        expect(within(mobile).getByRole('link', { name: 'Schedule' })).toHaveAttribute('href', '/schedule');
    });

    it('says the action once on small screens, as the card button and not as a coral line', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getAllByText('Add sessions')).toHaveLength(1);
        expect(within(mobile).getByText('Add sessions').closest('a')).toHaveAttribute('href', '/schedule');
    });

    it('keeps the stop on the desktop path with its coral line, and leaves its icon and line out of the card', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" />);
        // One circle on each path; the action is the phone button, the desktop coral line and the desktop button.
        expect(screen.getAllByRole('img', { name: 'Schedule' })).toHaveLength(2);
        expect(screen.getAllByText('Add sessions')).toHaveLength(3);
        expect(screen.getAllByRole('link', { name: 'Add sessions' })).toHaveLength(2);
        expect(screen.getAllByRole('heading', { name: 'Schedule' })).toHaveLength(2);
    });

    it("shows a current stop's links and chips in its small-screen card", () => {
        const details: JourneyStopModel[] = [
            {
                key: 'details',
                title: 'Event details',
                icon: 'details',
                status: 'current',
                href: '/settings',
                highlight: 'Edit event details',
                chips: [{ key: 'attending', label: '42 attending', tone: 'success' }],
                links: [{ key: 'venue', label: 'Add venue details', href: '/schedule?section=venue-session' }],
                card: { action: { label: 'Edit event details', href: '/settings' } },
            },
        ];
        render(<JourneyPath label="Get ready" stops={details} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getByRole('link', { name: 'Add venue details' })).toHaveAttribute('href', '/schedule?section=venue-session');
        expect(within(mobile).getByText('42 attending')).toBeInTheDocument();
        expect(within(mobile).getAllByText('Edit event details')).toHaveLength(1);
    });

    it("shows a current stop's remaining line in its small-screen card only", () => {
        const invitations: JourneyStopModel[] = [
            {
                key: 'invitations',
                title: 'Invitations & QR codes',
                icon: 'invitations',
                status: 'current',
                href: '/qr',
                highlight: 'Go to QR links',
                detail: '58 of 100 members',
                links: [],
                card: { action: { label: 'Go to QR links', href: '/qr' } },
            },
        ];
        render(<JourneyPath label="Get ready" stops={invitations} end="day" endLabel="On the day" />);
        const mobile = screen.getByTestId('journey-mobile');
        expect(within(mobile).getAllByText('58 of 100 members')).toHaveLength(1);
        expect(within(mobile).getAllByText('Go to QR links')).toHaveLength(1);
        // The phone card and the desktop path label; not the desktop card.
        expect(screen.getAllByText('58 of 100 members')).toHaveLength(2);
    });

    it('shows a current image stop inside its circle', () => {
        const after: JourneyStopModel[] = [
            {
                key: 'media',
                title: 'Media',
                icon: 'media',
                status: 'current',
                href: '/gallery',
                card: { action: { label: 'Download all', href: '/gallery' } },
            },
        ];
        render(<JourneyPath label="After" stops={after} end="heart" endLabel="After the event" />);
        expect(within(screen.getByTestId('journey-mobile')).getByAltText('Media')).toBeInTheDocument();
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

    it('runs the small-screen path into the replacement card without its own end', () => {
        render(<JourneyPath label="Get ready" stops={stops} end="day" endLabel="On the day" replacementCard={<p>All set card</p>} />);
        expect(within(screen.getByTestId('journey-mobile')).queryByAltText('On the day')).toBeNull();
    });
});
