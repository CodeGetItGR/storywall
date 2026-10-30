import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useAdminQrCardTemplates', () => ({ usePatchQrCardTemplate: () => patch }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'api error' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));

import { useQrCardLayoutEditor } from '@/hooks/useQrCardLayoutEditor';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { DEFAULT_QR_CARD_LAYOUT } from '@/lib/qrCardLayout';

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    artworkWidth: 1748,
};

function key(name: string, options: { shiftKey?: boolean; target?: EventTarget } = {}) {
    return { key: name, shiftKey: false, target: document.body, preventDefault: vi.fn(), ...options } as unknown as KeyboardEvent<HTMLElement>;
}

function alignEvent(value: string) {
    return { currentTarget: { value } } as never;
}

function renderEditor() {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const hook = renderHook(() => useQrCardLayoutEditor({ template: LINEN, onSavedAction: onSaved, onCloseAction: onClose }));
    return { ...hook, onSaved, onClose };
}

beforeEach(() => {
    patch.mutateAsync.mockReset();
});

describe('useQrCardLayoutEditor', () => {
    it('starts on the default layout, clean, nothing selected', () => {
        const { result } = renderEditor();
        expect(result.current.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
        expect(result.current.dirty).toBe(false);
        expect(result.current.selected).toBeNull();
    });

    it('nudges the selected element with the arrow keys', () => {
        const { result } = renderEditor();
        act(() => result.current.select('code'));
        act(() => result.current.handleKeyDown(key('ArrowRight')));
        expect(result.current.layout.code.x).toBe(21);
        act(() => result.current.handleKeyDown(key('ArrowRight', { shiftKey: true })));
        expect(result.current.layout.code.x).toBe(26);
        expect(result.current.dirty).toBe(true);
    });

    it('leaves arrow keys to an input in the side panel', () => {
        const { result } = renderEditor();
        act(() => result.current.select('code'));
        act(() => result.current.handleKeyDown(key('ArrowRight', { target: document.createElement('input') })));
        expect(result.current.layout.code.x).toBe(20.5);
    });

    it('Escape deselects first, then closes when clean', () => {
        const { result, onClose } = renderEditor();
        act(() => result.current.select('title'));
        act(() => result.current.handleKeyDown(key('Escape')));
        expect(result.current.selected).toBeNull();
        expect(onClose).not.toHaveBeenCalled();
        act(() => result.current.handleKeyDown(key('Escape')));
        expect(onClose).toHaveBeenCalled();
    });

    it('asks before closing with changes', () => {
        const { result, onClose } = renderEditor();
        act(() => result.current.handleTitleAlignChange(alignEvent('left')));
        act(() => result.current.requestClose());
        expect(result.current.confirmingDiscard).toBe(true);
        expect(onClose).not.toHaveBeenCalled();
        act(() => result.current.keepEditing());
        expect(result.current.confirmingDiscard).toBe(false);
    });

    it('sets the title and lines alignment from the radio value', () => {
        const { result } = renderEditor();
        act(() => result.current.handleTitleAlignChange(alignEvent('left')));
        act(() => result.current.handleLinesAlignChange(alignEvent('right')));
        expect(result.current.layout.title.align).toBe('left');
        expect(result.current.layout.lines.align).toBe('right');
    });

    it('resets to the default layout', () => {
        const { result } = renderEditor();
        act(() => result.current.handleLinesAlignChange(alignEvent('right')));
        act(() => result.current.reset());
        expect(result.current.layout).toEqual(DEFAULT_QR_CARD_LAYOUT);
    });

    it('saves the layout, hands back the template and closes', async () => {
        const saved = { ...LINEN, layout: DEFAULT_QR_CARD_LAYOUT };
        patch.mutateAsync.mockResolvedValue(saved);
        const { result, onSaved, onClose } = renderEditor();
        act(() => result.current.handleTitleAlignChange(alignEvent('left')));

        await act(() => result.current.save());

        expect(patch.mutateAsync).toHaveBeenCalledWith({ id: 't1', input: { layout: result.current.layout } });
        expect(onSaved).toHaveBeenCalledWith(saved);
        expect(onClose).toHaveBeenCalled();
    });

    it('keeps the editor open with a message when a save fails', async () => {
        patch.mutateAsync.mockRejectedValue(new TypeError('offline'));
        const { result, onClose } = renderEditor();

        await act(() => result.current.save());

        expect(result.current.saveError).toBe('layout.network'); // the mocked t returns the key
        expect(onClose).not.toHaveBeenCalled();
    });

    it('switches the sample to the gift card stack', () => {
        const { result } = renderEditor();
        expect(result.current.sampleLines).toHaveLength(1);
        act(() => result.current.handleSampleChange({ currentTarget: { value: 'gift' } } as never));
        expect(result.current.sampleLines.map((line) => line.tone)).toEqual(['body', 'code', 'small', 'strong']);
    });
});
