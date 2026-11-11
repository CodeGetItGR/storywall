import { act, renderHook } from '@testing-library/react';
import { type ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationTextDrawer } from '@/hooks/useInvitationTextDrawer';
import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), remove: vi.fn() }));

vi.mock('@/hooks/useAdminInvitationTexts', () => ({
    useCreateInvitationText: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchInvitationText: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useDeleteInvitationText: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

const EVENT_TYPES = [
    { key: 'WEDDING', label: 'Wedding' },
    { key: 'BAPTISM', label: 'Baptism' },
];

const TEXT: AdminInvitationTextDto = { id: 't1', eventType: 'BAPTISM', language: 'el', label: 'Formal', body: 'Line one\nLine two', sortOrder: 0 };

function field(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function renderDrawer(text: AdminInvitationTextDto | null, onDoneAction = vi.fn(), texts = [TEXT]) {
    return renderHook(() => useInvitationTextDrawer({ text, texts, eventTypes: EVENT_TYPES, onDoneAction }));
}

beforeEach(() => {
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.remove.mockReset();
});

describe('useInvitationTextDrawer', () => {
    it('holds a save until the label and text are filled in', async () => {
        const { result } = renderDrawer(null);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.errors).toEqual({ label: true, body: true });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('creates a text for the first event type on offer until another is picked', async () => {
        const onDoneAction = vi.fn();
        mocks.create.mockResolvedValue(TEXT);
        const { result } = renderDrawer(null, onDoneAction);

        expect(result.current.eventType).toBe('WEDDING');
        act(() => result.current.handleFieldChange(field('label', 'Formal')));
        act(() => result.current.handleFieldChange(field('body', 'Line one\nLine two')));
        act(() => result.current.handleLanguageChange('en'));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({ eventType: 'WEDDING', language: 'en', label: 'Formal', body: 'Line one\nLine two', sortOrder: 0 });
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('sends only what changed on an existing text, and puts a moved text last in its new group', async () => {
        const { result } = renderDrawer(TEXT, vi.fn(), [TEXT, { ...TEXT, id: 'w1', eventType: 'WEDDING', sortOrder: 2 }]);
        act(() => result.current.handleEventTypeChange({ currentTarget: { value: 'WEDDING' } } as ChangeEvent<HTMLSelectElement>));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).toHaveBeenCalledWith({ id: 't1', input: { eventType: 'WEDDING', sortOrder: 3 } });
    });

    it('deletes only after the confirmation, then closes', async () => {
        const onDoneAction = vi.fn();
        mocks.remove.mockResolvedValue(undefined);
        const { result } = renderDrawer(TEXT, onDoneAction);

        act(() => result.current.openDelete());
        expect(result.current.confirmingDelete).toBe(true);
        expect(mocks.remove).not.toHaveBeenCalled();
        await act(() => result.current.confirmDelete());

        expect(mocks.remove).toHaveBeenCalledWith('t1');
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('shows a failed delete in the drawer and closes the confirmation', async () => {
        const error = new ApiError(404, { errorCode: 4004 });
        mocks.remove.mockRejectedValue(error);
        const { result } = renderDrawer(TEXT);

        act(() => result.current.openDelete());
        await act(() => result.current.confirmDelete());

        expect(result.current.confirmingDelete).toBe(false);
        expect(result.current.failure).toBe(error);
    });
});
