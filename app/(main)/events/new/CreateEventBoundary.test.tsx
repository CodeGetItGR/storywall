import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LINK = '/events/new?step=details&type=wedding&plan=START&option=o1';

const state = vi.hoisted(() => ({
    emailVerified: null as boolean | null,
    replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { role: 'USER', emailVerified: state.emailVerified }, isAuthenticated: true, isBootstrapping: false }),
}));
vi.mock('@/hooks/useCreateEventRun', () => ({ useCreateEventRun: () => ({ isReady: true }) }));
vi.mock('@/hooks/useCurrentReturnPath', () => ({ useCurrentReturnPath: () => LINK }));
vi.mock('@/components/event/create/CreateEventRouteState', () => ({ CreateEventRouteState: () => null }));

import CreateEventBoundary from '@/app/(main)/events/new/CreateEventBoundary';
import { readPendingCreateEventPath, rememberPendingCreateEventPath } from '@/lib/pendingCreateEvent';

describe('CreateEventBoundary', () => {
    beforeEach(() => {
        state.replace.mockReset();
        window.localStorage.clear();
    });
    afterEach(cleanup);

    it('remembers the link when it sends an unverified account home', () => {
        state.emailVerified = false;
        render(<CreateEventBoundary />);
        expect(readPendingCreateEventPath()).toBe(LINK);
        expect(state.replace).toHaveBeenCalledWith('/home');
    });

    it('forgets the link once a verified account reaches the form', () => {
        rememberPendingCreateEventPath(LINK);
        state.emailVerified = true;
        render(<CreateEventBoundary />);
        expect(readPendingCreateEventPath()).toBeNull();
        expect(state.replace).not.toHaveBeenCalled();
    });

    it('keeps the link while the account is not known yet', () => {
        rememberPendingCreateEventPath(LINK);
        state.emailVerified = null;
        render(<CreateEventBoundary />);
        expect(readPendingCreateEventPath()).toBe(LINK);
    });
});
