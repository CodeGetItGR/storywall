import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { KeyboardEventHandler, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useAdminQrCardTemplates', () => ({ usePatchQrCardTemplate: () => patch }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'api error' }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ children, footer, onKeyDown }: { children: ReactNode; footer: ReactNode; onKeyDown?: KeyboardEventHandler<HTMLDivElement> }) => (
        <div onKeyDown={onKeyDown}>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/event/ThemeFontFace', () => ({ ThemeFontFace: () => null }));
vi.mock('@/components/admin/qrCards/layoutEditor/QrCardLayoutDiscardModal', () => ({
    QrCardLayoutDiscardModal: ({ open }: { open: boolean }) => (open ? <div>discard-open</div> : null),
}));

import { QrCardLayoutEditor } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutEditor';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: null,
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: true,
    layout: null,
    artworkWidth: null,
};

beforeEach(() => {
    patch.mutateAsync.mockReset().mockImplementation(async ({ input }) => ({ ...LINEN, layout: input.layout }));
});
afterEach(cleanup);

function renderEditor() {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<QrCardLayoutEditor template={LINEN} style={PLAIN_QR_CARD_STYLE} onSavedAction={onSaved} onCloseAction={onClose} />);
    return { onSaved, onClose };
}

describe('QrCardLayoutEditor', () => {
    it('asks to select something first', () => {
        renderEditor();
        expect(screen.getByText('selectHint')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it('moves the code with the keyboard and saves the layout', async () => {
        const { onSaved, onClose } = renderEditor();
        const code = screen.getByRole('button', { name: 'elements.code' });
        fireEvent.focus(code);
        // Sideways: nothing shares the code's rows, so it moves the full 5 mm.
        fireEvent.keyDown(code, { key: 'ArrowRight', shiftKey: true });

        expect(screen.getByText(/position .*"x":"25.5"/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(patch.mutateAsync.mock.calls[0][0].input.layout.code.x).toBe(25.5);
        expect(onSaved).toHaveBeenCalled();
    });

    it('turns the panel off and shows the scan note', () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: 'elements.code' }));
        fireEvent.click(screen.getByRole('switch', { name: 'panel' }));
        expect(screen.getByText('panelOffNote')).toBeInTheDocument();
    });

    it('asks before discarding changes', () => {
        const { onClose } = renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: 'elements.title' }));
        fireEvent.click(screen.getByRole('radio', { name: 'alignOptions.left' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('discard-open')).toBeInTheDocument();
    });

    it('asks before discarding on Escape from the toolbar', () => {
        const { onClose } = renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: 'elements.title' }));
        fireEvent.click(screen.getByRole('radio', { name: 'alignOptions.left' }));
        const reset = screen.getByRole('button', { name: 'reset' });
        // The first Escape deselects, the second asks.
        fireEvent.keyDown(reset, { key: 'Escape' });
        fireEvent.keyDown(reset, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('discard-open')).toBeInTheDocument();
    });
});
