import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventWizardAccount } from '@/hooks/useCreateEventWizardAccount';
import { routes } from '@/lib/routes';

const auth = vi.hoisted(() => ({ current: { isBootstrapping: false, user: null as null | { emailVerified: boolean | null; role: string } } }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const view = vi.hoisted(() => ({ current: { view: 'choose', open: vi.fn(), show: vi.fn(), back: vi.fn() } }));
const form = vi.hoisted(() => ({ current: { step: 'account', goToStep: vi.fn() } }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/hooks/useCreateEventWizardAccountView', () => ({ useCreateEventWizardAccountView: () => view.current }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));

beforeEach(() => {
    auth.current = { isBootstrapping: false, user: null };
    view.current = { view: 'choose', open: vi.fn(), show: vi.fn(), back: vi.fn() };
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCreateEventWizardAccount', () => {
    it('waits on the choose screen while signed out', () => {
        renderHook(() => useCreateEventWizardAccount());
        expect(form.current.goToStep).not.toHaveBeenCalled();
        expect(view.current.show).not.toHaveBeenCalled();
    });

    it('goes to review once the account is verified', () => {
        auth.current.user = { emailVerified: true, role: 'USER' };
        renderHook(() => useCreateEventWizardAccount());
        expect(form.current.goToStep).toHaveBeenCalledWith('overview');
    });

    it('opens the code screen for an unverified account', () => {
        auth.current.user = { emailVerified: false, role: 'USER' };
        renderHook(() => useCreateEventWizardAccount());
        expect(view.current.show).toHaveBeenCalledWith('code');
    });

    it('leaves the change email screen alone', () => {
        auth.current.user = { emailVerified: false, role: 'USER' };
        view.current.view = 'email';
        renderHook(() => useCreateEventWizardAccount());
        expect(view.current.show).not.toHaveBeenCalled();
    });

    it('sends an admin to the console', () => {
        auth.current.user = { emailVerified: true, role: 'ADMIN' };
        renderHook(() => useCreateEventWizardAccount());
        expect(router.replace).toHaveBeenCalledWith(routes.admin);
    });
});
