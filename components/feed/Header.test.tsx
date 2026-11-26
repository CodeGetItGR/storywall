import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from '@/components/feed/Header';

vi.mock('@/hooks/useFeedBackdropStrip', () => ({ useFeedBackdropStrip: () => ({ current: null }) }));
vi.mock('@/components/common/Logo', () => ({ Logo: () => <span>Logo</span> }));
vi.mock('@/components/feed/Countdown', () => ({ Countdown: () => <span>Countdown</span> }));

afterEach(cleanup);

describe('Header', () => {
    it('draws the page only on its fill: a colour on the header itself would hide the theme picture', () => {
        const { container } = render(<Header countdownTime={0} eventId="evt" />);
        const header = container.firstElementChild!;
        const fill = container.querySelector('.feed-backdrop-strip-fill')!;
        expect(header.className).not.toMatch(/\bbg-/);
        expect(fill.getAttribute('aria-hidden')).toBe('true');
        expect(fill.classList.contains('bg-event')).toBe(true);
    });
});
