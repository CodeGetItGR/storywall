import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePublishInvitation } from '@/hooks/usePublishInvitation';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useSlugAvailability', () => ({ useSlugAvailability: (slug: string) => ({ slug, check: 'empty' }) }));
vi.mock('@/lib/api/client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api/client')>();
    return { ...actual, api: { get: mocks.get, post: mocks.post } };
});

const PLAN_MISSING = new ApiError(409, { errorCode: 5012 });

function render(options: { eventId: string | null; offersInvitationAddon?: (eventId: string) => Promise<boolean> }) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(
        () =>
            usePublishInvitation({
                draftId: 'draft-1',
                eventId: options.eventId,
                flush: async () => true,
                revision: () => 3,
                claim: async () => true,
                offersInvitationAddon: options.offersInvitationAddon,
            }),
        { wrapper },
    );
}

describe('usePublishInvitation and the add-on step', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Never published: the link sheet would open next.
        mocks.get.mockRejectedValue(new ApiError(404, {}));
    });

    it('opens the add-on step before the link when the plan sells the invitation', async () => {
        const offersInvitationAddon = vi.fn(async () => true);
        const { result } = render({ eventId: null, offersInvitationAddon });

        await act(async () => result.current.eventStep.onAttached('evt-1'));

        expect(offersInvitationAddon).toHaveBeenCalledWith('evt-1');
        expect(result.current.addonStep).toMatchObject({ open: true, eventId: 'evt-1' });
        expect(result.current.sheet.open).toBe(false);
    });

    it('asks for the link as before when no add-on is sold', async () => {
        const { result } = render({ eventId: null, offersInvitationAddon: async () => false });

        await act(async () => result.current.eventStep.onAttached('evt-1'));

        expect(result.current.addonStep.open).toBe(false);
        expect(result.current.sheet.open).toBe(true);
    });

    it('opens the add-on step when publishing again fails with plan-missing', async () => {
        mocks.get.mockResolvedValue({ slug: 'maria-nikos' });
        mocks.post.mockRejectedValue(PLAN_MISSING);
        const { result } = render({ eventId: 'evt-1', offersInvitationAddon: async () => true });

        await act(async () => result.current.start());

        expect(result.current.addonStep.open).toBe(true);
        expect(result.current.planPrompt).toBeNull();
    });

    it('keeps the plan dialog when plan-missing comes and no add-on can be bought', async () => {
        mocks.get.mockResolvedValue({ slug: 'maria-nikos' });
        mocks.post.mockRejectedValue(PLAN_MISSING);
        const { result } = render({ eventId: 'evt-1', offersInvitationAddon: async () => false });

        await act(async () => result.current.start());

        expect(result.current.addonStep.open).toBe(false);
        expect(result.current.planPrompt).toBe('plan-missing');
    });

    it('closes the add-on step', async () => {
        const { result } = render({ eventId: 'evt-1', offersInvitationAddon: async () => true });

        await act(async () => result.current.start());
        expect(result.current.addonStep.open).toBe(true);
        act(() => result.current.addonStep.close());
        expect(result.current.addonStep.open).toBe(false);
    });

    it('goes on to the link when the step finds the invitation covered now', async () => {
        const offersInvitationAddon = vi.fn(async () => true);
        const { result } = render({ eventId: null, offersInvitationAddon });
        await act(async () => result.current.eventStep.onAttached('evt-1'));

        await act(async () => result.current.addonStep.fallBack('publish'));

        expect(result.current.addonStep.open).toBe(false);
        expect(result.current.sheet.open).toBe(true);
        expect(offersInvitationAddon).toHaveBeenCalledTimes(1);
    });

    it("shows the plan dialog when the step can't read the event", async () => {
        const { result } = render({ eventId: null, offersInvitationAddon: async () => true });
        await act(async () => result.current.eventStep.onAttached('evt-1'));

        act(() => result.current.addonStep.fallBack('plan'));

        expect(result.current.addonStep.open).toBe(false);
        expect(result.current.planPrompt).toBe('plan-missing');
    });
});
