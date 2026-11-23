import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from '@/components/feed/Header';

vi.mock('@/components/feed/Countdown', () => ({ Countdown: () => null }));
vi.mock('@/components/common/Logo', () => ({ Logo: () => <span>logo</span> }));

afterEach(cleanup);

describe('Header', () => {
    it('marks itself for the pinned switch, and draws it just below the header', () => {
        render(<Header countdownTime={0} eventId="e-1" pinned={<button type="button">pill</button>} />);
        const header = document.querySelector('[data-feed-header]') as HTMLElement;
        expect(header).toBeTruthy();
        expect(header.contains(screen.getByRole('button', { name: 'pill' }))).toBe(true);
    });

    it('draws nothing extra without it', () => {
        render(<Header countdownTime={0} eventId="e-1" />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});
