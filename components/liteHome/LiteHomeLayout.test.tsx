import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiteHomeLayout } from '@/components/liteHome/LiteHomeLayout';
import { capabilitiesOf } from '@/lib/__fixtures__/eventCapabilities';

const state = vi.hoisted(() => ({
    event: null as Record<string, unknown> | null,
    isHost: true,
    isLoading: false,
    isDesktop: true,
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useEventContextLoading: () => state.isLoading,
    useIsHost: () => state.isHost,
}));
vi.mock('@/hooks/useMediaQuery', () => ({ MD_MEDIA_QUERY: 'md', useMediaQuery: () => state.isDesktop }));
vi.mock('@/components/layout/RightContextPanel', () => ({
    RightContextPanel: ({ liteHome }: { liteHome?: boolean }) => <aside data-testid="panel">{String(liteHome)}</aside>,
}));

const gallery = { moduleKey: 'gallery', isEnabled: true, isAvailable: true };
const posts = { moduleKey: 'posts', isEnabled: true, isAvailable: true };

function event_(modules: (typeof gallery)[], overrides: Record<string, unknown> = {}) {
    return { id: 'e1', status: 'ACTIVE', deletedAt: null, suspended: false, modules, capabilities: capabilitiesOf(modules), ...overrides };
}

function renderLayout() {
    render(<LiteHomeLayout>page</LiteHomeLayout>);
    expect(screen.getByText('page')).toBeTruthy();
    return screen.queryByTestId('panel');
}

describe('LiteHomeLayout', () => {
    beforeEach(() => {
        Object.assign(state, { event: event_([gallery]), isHost: true, isLoading: false, isDesktop: true });
    });
    afterEach(cleanup);

    it('shows the lite panel beside the home of a live lite event on desktop', () => {
        expect(renderLayout()?.textContent).toBe('true');
    });

    it.each([
        ['on a phone', { isDesktop: false }],
        ['to a non-host', { isHost: false }],
        ['while the event loads', { isLoading: true }],
        ['on a full event', { event: event_([posts, gallery]) }],
        ['on a lite draft', { event: event_([gallery], { status: 'DRAFT' }) }],
        ['on a deleted lite event', { event: event_([gallery], { deletedAt: '2026-11-01T00:00:00Z' }) }],
        ['on a suspended lite event', { event: event_([gallery], { suspended: true }) }],
    ])('leaves it out %s', (_name, overrides) => {
        Object.assign(state, overrides);
        expect(renderLayout()).toBeNull();
    });
});
