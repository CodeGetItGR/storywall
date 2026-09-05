import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Countdown } from '@/components/feed/Countdown';

vi.mock('canvas-confetti', () => {
    const createInstance = vi.fn(() => Object.assign(vi.fn(), { reset: vi.fn() }));
    return {
        default: Object.assign(vi.fn(), { create: createInstance, shapeFromText: vi.fn(() => 'circle') }),
    };
});

const messages = {
    Countdown: {
        days: 'Days',
        daysShort: 'D',
        hours: 'Hours',
        hoursShort: 'H',
        minutes: 'Minutes',
        minutesShort: 'M',
        seconds: 'Seconds',
        secondsShort: 'S',
        started: "It's happening!",
    },
};

function renderCountdown(time: number) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <Countdown eventId="event-123" time={time} />
        </NextIntlClientProvider>,
    );
}

describe('Countdown', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders day/hour/minute/second tiles while time remains', () => {
        renderCountdown(Date.now() + 2 * 24 * 60 * 60 * 1000);

        expect(screen.getByText('D')).toBeInTheDocument();
        expect(screen.getByText('H')).toBeInTheDocument();
        expect(screen.getByText('M')).toBeInTheDocument();
        expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('shows the started label instead of zeroed tiles once the target time has passed', () => {
        renderCountdown(Date.now() - 60_000);

        expect(screen.getByText("It's happening!")).toBeInTheDocument();
        expect(screen.queryByText('D')).not.toBeInTheDocument();
    });

    it('renders the fireworks overlay canvas when within the grace window', () => {
        const { container } = renderCountdown(Date.now() - 60_000);

        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('does not render the fireworks overlay when outside the grace window', () => {
        const { container } = renderCountdown(Date.now() - 45 * 60 * 1000);

        expect(container.querySelector('canvas')).toBeNull();
    });
});
