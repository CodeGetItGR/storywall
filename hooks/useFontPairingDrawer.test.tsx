import { act, renderHook } from '@testing-library/react';
import { type ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFontPairingDrawer } from '@/hooks/useFontPairingDrawer';
import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({ create: vi.fn(), patch: vi.fn(), uploaded: [] as unknown[], files: [] as unknown[] }));

vi.mock('@/hooks/useAdminFontPairings', () => ({
    useCreateFontPairing: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchFontPairing: () => ({ mutateAsync: mocks.patch, isPending: false }),
}));
vi.mock('@/hooks/useAdminThemeFonts', () => ({ useAdminThemeFonts: () => ({ data: mocks.uploaded }) }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: mocks.files }) }));

const PAIRING: AdminFontPairingDto = {
    id: 'p1',
    name: 'Classic',
    titleFont: "'Playfair Display',serif",
    bodyFont: 'Lora,serif',
    buttonFont: null,
    hidden: false,
    sortOrder: 0,
    eventTypes: [],
};

function input(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function select(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLSelectElement>;
}

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function renderDrawer(pairing: AdminFontPairingDto | null, onDoneAction = vi.fn()) {
    return renderHook(() => useFontPairingDrawer({ pairing, createSortOrder: 3, onDoneAction }));
}

beforeEach(() => {
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.uploaded = [];
    mocks.files = [];
});

describe('useFontPairingDrawer', () => {
    it('holds a save until the pairing has a name', async () => {
        const { result } = renderDrawer(null);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.errors).toEqual({ name: true });
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('creates a pairing with its fonts and event types, last in the list', async () => {
        const onDoneAction = vi.fn();
        mocks.create.mockResolvedValue(PAIRING);
        const { result } = renderDrawer(null, onDoneAction);

        act(() => result.current.handleNameChange(input('name', ' Classic ')));
        act(() => result.current.handleFontChange(select('titleFont', "'Playfair Display',serif")));
        act(() => result.current.handleFontChange(select('buttonFont', 'Cinzel,serif')));
        act(() => result.current.handleEventTypeChange('WEDDING', true));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({
            name: 'Classic',
            titleFont: "'Playfair Display',serif",
            bodyFont: 'Georgia,serif',
            buttonFont: 'Cinzel,serif',
            hidden: false,
            sortOrder: 3,
            eventTypes: ['WEDDING'],
        });
        expect(onDoneAction).toHaveBeenCalledOnce();
    });

    it('sends only what changed, and closes without a request when nothing did', async () => {
        const onDoneAction = vi.fn();
        const { result } = renderDrawer(PAIRING, onDoneAction);

        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(onDoneAction).toHaveBeenCalledOnce();

        act(() => result.current.handleVisibilityChange('HIDDEN'));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).toHaveBeenCalledWith({ id: 'p1', input: { hidden: true } });
    });

    it('keeps the drawer open on a refused save', async () => {
        const onDoneAction = vi.fn();
        const error = new ApiError(400, { errorCode: 3001 });
        mocks.patch.mockRejectedValue(error);
        const { result } = renderDrawer(PAIRING, onDoneAction);

        act(() => result.current.handleNameChange(input('name', 'Other')));
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.failure).toBe(error);
        expect(onDoneAction).not.toHaveBeenCalled();
    });

    it('previews the button in the text font until one is picked, and loads the uploaded faces in use', () => {
        mocks.uploaded = [{ id: 'f1', key: 'theos', familyName: 'Theos', fallback: 'serif', archived: false, url: '/api/theme-fonts/theos/1.woff2' }];
        mocks.files = [{ key: 'theos', familyName: 'Theos', fallback: 'serif', url: '/api/theme-fonts/theos/1.woff2' }];
        const { result } = renderDrawer({ ...PAIRING, titleFont: "'Theos',serif" });

        expect(result.current.previewButtonFont).toBe('Lora,serif');
        expect(result.current.previewCss).toContain('font-family:"Theos"');
        expect(result.current.fontOptions.map((option) => option.label)).toContain('Theos');
    });
});
