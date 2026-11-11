import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventWizardAccess } from '@/hooks/useCreateEventWizardAccess';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const auth = vi.hoisted(() => ({ current: { isBootstrapping: false, user: null as null | { role: string } } }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));

afterEach(() => vi.clearAllMocks());

describe('useCreateEventWizardAccess', () => {
    it('lets a signed-out visitor in', () => {
        auth.current = { isBootstrapping: false, user: null };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(false);
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('waits while the session is being read', () => {
        auth.current = { isBootstrapping: true, user: null };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(true);
    });

    it('sends an admin to the console', () => {
        auth.current = { isBootstrapping: false, user: { role: 'ADMIN' } };
        expect(renderHook(() => useCreateEventWizardAccess()).result.current.isBlocked).toBe(true);
        expect(router.replace).toHaveBeenCalledWith('/admin');
    });
});
