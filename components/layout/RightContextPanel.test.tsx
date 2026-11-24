import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RightContextPanel } from '@/components/layout/RightContextPanel';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useRightContextPanel', () => ({
    useRightContextPanel: () => ({ visible: true, activeEvent: { id: 'evt' }, isHost: false, actionItems: [] }),
}));

afterEach(cleanup);

describe('RightContextPanel', () => {
    it("draws a white curtain with ink text only on the feed's theme", () => {
        render(<RightContextPanel />);
        const classes = screen.getByRole('complementary').className.split(' ');
        expect(classes).toContain('bg-event');
        expect(classes).toContain('[.feed-backdrop_&]:bg-white/50');
        expect(classes).toContain('[.feed-backdrop_&]:[--ink-muted:var(--ink)]');
        expect(classes).toContain('[.feed-backdrop_&]:[--ink-faint:var(--ink)]');
        // Nothing of the curtain outside a theme.
        expect(classes.filter((name) => /^(bg-white|\[--ink)/.test(name))).toEqual([]);
    });
});
