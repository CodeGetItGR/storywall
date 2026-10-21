import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnnouncementComposer } from '@/hooks/useAnnouncementComposer';

const push = vi.fn();
const create = vi.fn();
const event = vi.hoisted(() => ({
    value: { status: 'ACTIVE', modules: [{ moduleKey: 'posts', isAvailable: true }] } as unknown,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/usePosts', () => ({ useCreatePost: () => ({ mutateAsync: create, isPending: false }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { contentLimits: { postContentMaxLength: 20 } } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'failed' }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => event.value }));

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

beforeEach(() => {
    push.mockReset();
    create.mockReset();
    event.value = { status: 'ACTIVE', modules: [{ moduleKey: 'posts', isAvailable: true }] };
});

describe('useAnnouncementComposer', () => {
    it('reads the limit from the app config', () => {
        expect(renderHook(() => useAnnouncementComposer('e1')).result.current.maxLength).toBe(20);
    });

    it('refuses an empty message', async () => {
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('   '));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('announcement.empty');
        expect(create).not.toHaveBeenCalled();
    });

    it('posts an unpinned announcement and goes to the feed', async () => {
        create.mockResolvedValue({ id: 'p1', eventId: 'e1' });
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('  Dinner at 9  '));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(create).toHaveBeenCalledWith({ eventId: 'e1', type: 'ANNOUNCEMENT', content: 'Dinner at 9', isPinned: false });
        expect(push).toHaveBeenCalledWith('/events/e1/feed');
    });

    it('shows the server error and keeps the message', async () => {
        create.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        act(() => result.current.setContent('Dinner at 9'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.error).toBe('failed');
        expect(result.current.content).toBe('Dinner at 9');
        expect(push).not.toHaveBeenCalled();
    });

    it('does not post while the event is read-only', async () => {
        event.value = { status: 'DRAFT', modules: [{ moduleKey: 'posts', isAvailable: true }] };
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        expect(result.current.blockedMessage).toBe('eventReadOnly');
        act(() => result.current.setContent('Dinner at 9'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(create).not.toHaveBeenCalled();
    });

    it('does not post while the posts module is off', async () => {
        event.value = { status: 'ACTIVE', modules: [{ moduleKey: 'posts', isAvailable: false }] };
        const { result } = renderHook(() => useAnnouncementComposer('e1'));
        expect(result.current.blockedMessage).toBe('moduleUnavailable');
        act(() => result.current.setContent('Dinner at 9'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(create).not.toHaveBeenCalled();
    });
});
