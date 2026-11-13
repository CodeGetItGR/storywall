import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { KeyboardEventHandler, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useAdminQrCardTemplates', () => ({
    usePatchQrCardTemplate: () => patch,
    useUploadQrCardArtwork: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useAdminThemeFonts', () => ({
    adminThemeFontKeys: { all: ['admin', 'theme-fonts'] },
    useAdminThemeFonts: () => ({ data: [], isPending: false, isError: false }),
}));
// The other language's catalog never loads here; its placeholders stay blank.
vi.mock('@/hooks/useQrCardStandardWording', () => ({
    useQrCardStandardWording: () => ({ en: { join: 'Scan to join' }, el: {} }),
}));
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
    render(
        <QueryClientProvider client={new QueryClient()}>
            <QrCardLayoutEditor template={LINEN} onSavedAction={onSaved} onCloseAction={onClose} />
        </QueryClientProvider>,
    );
    return { onSaved, onClose };
}

describe('QrCardLayoutEditor', () => {
    it('shows the card with its artwork and text colour while nothing is selected', () => {
        renderEditor();
        expect(screen.getByRole('heading', { name: 'elements.card' })).toBeInTheDocument();
        expect(screen.getByText('selectHint')).toBeInTheDocument();
        expect(screen.getByText('artworkChoose')).toBeInTheDocument();
        expect(screen.getByLabelText('textColorHex')).toHaveValue('#5A3E2B');
        expect(screen.queryByLabelText('codeColorHex')).toBeNull();
        expect(screen.getByRole('button', { name: 'save' })).toBeDisabled();
    });

    it("shows the code's colour, its contrast and the logo when the code is selected", () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.code/ }));
        expect(screen.getByLabelText('codeColorHex')).toHaveValue('#1F3A5A');
        expect(screen.getByLabelText('codeColorHex')).toHaveAccessibleDescription(/^codeContrastOk/);
        fireEvent.change(screen.getByLabelText('codeColorHex'), { target: { value: '#777777' } });
        expect(screen.getByText(/^codeContrastLow/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('switch', { name: 'centerLogo' }));
        expect(screen.getByRole('button', { name: 'save' })).toBeEnabled();
    });

    it('picks the title font when the title is selected', () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.title/ }));
        expect(screen.getByRole('combobox', { name: 'headingFont' })).toHaveValue('');
        expect(screen.getByLabelText('textColorHex')).toHaveValue('#5A3E2B');
    });

    it('colours the text from the lines too', () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.lines/ }));
        fireEvent.change(screen.getByLabelText('textColorHex'), { target: { value: '#2B2B2B' } });
        expect(screen.getByRole('button', { name: 'save' })).toBeEnabled();
    });

    it("words the lines in both languages, the standard line as each input's placeholder", async () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.lines/ }));
        const join = screen.getByRole('textbox', { name: 'wording.input.en {"line":"wording.keys.join"}' });
        expect(join).toHaveAttribute('placeholder', 'Scan to join');
        fireEvent.change(join, { target: { value: 'Scan to celebrate' } });
        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await vi.waitFor(() => expect(patch.mutateAsync).toHaveBeenCalled());
        expect(patch.mutateAsync.mock.calls[0][0].input.layout.lines.text).toEqual({ join: { en: 'Scan to celebrate' } });
    });

    it('moves the code with the keyboard and saves the layout', async () => {
        const { onSaved, onClose } = renderEditor();
        const code = screen.getByRole('button', { name: /^elements\.code/ });
        fireEvent.focus(code);
        // Shift moves 5 mm.
        fireEvent.keyDown(code, { key: 'ArrowRight', shiftKey: true });

        expect(screen.getByText(/position .*"x":"25.5"/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(patch.mutateAsync.mock.calls[0][0].input.layout.code.x).toBe(25.5);
        expect(onSaved).toHaveBeenCalled();
    });

    it('turns the panel off and shows the scan note', () => {
        renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.code/ }));
        fireEvent.click(screen.getByRole('switch', { name: 'panel' }));
        expect(screen.getByText('panelOffNote')).toBeInTheDocument();
    });

    it('adds a text field, saves its words, and removes the title', async () => {
        renderEditor();
        fireEvent.click(screen.getByRole('button', { name: 'addFixed' }));
        expect(screen.getByRole('button', { name: /^elements\.fixed/ })).toBeInTheDocument();
        fireEvent.change(screen.getByRole('textbox', { name: 'fieldText.en' }), { target: { value: 'Thank you' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'fieldText.el' }), { target: { value: 'Ευχαριστούμε' } });

        fireEvent.focus(screen.getByRole('button', { name: /^elements\.title/ }));
        fireEvent.click(screen.getByRole('button', { name: 'removeTitle' }));
        expect(screen.queryByRole('button', { name: /^elements\.title/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'restoreTitle' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await vi.waitFor(() => expect(patch.mutateAsync).toHaveBeenCalled());
        const layout = patch.mutateAsync.mock.calls[0][0].input.layout;
        expect(layout.title).toBeNull();
        expect(layout.fields).toEqual([expect.objectContaining({ kind: 'fixed', text: { en: 'Thank you', el: 'Ευχαριστούμε' } })]);
    });

    it('adds the logo once, colours it, and saves it', async () => {
        renderEditor();
        fireEvent.click(screen.getByRole('button', { name: 'addLogo' }));
        expect(screen.getByRole('button', { name: /^elements\.logo/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'addLogo' })).not.toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'logoColorOptions.original' })).toBeChecked();

        // One colour starts as the card's text colour.
        fireEvent.click(screen.getByRole('radio', { name: 'logoColorOptions.one' }));
        fireEvent.change(screen.getByLabelText('color'), { target: { value: '#ffffff' } });

        fireEvent.click(screen.getByRole('button', { name: 'save' }));
        await vi.waitFor(() => expect(patch.mutateAsync).toHaveBeenCalled());
        expect(patch.mutateAsync.mock.calls[0][0].input.layout.logo).toEqual({ x: 30, y: 129.7, width: 45, color: '#FFFFFF' });
    });

    it('removes the logo', () => {
        renderEditor();
        fireEvent.click(screen.getByRole('button', { name: 'addLogo' }));
        fireEvent.click(screen.getByRole('button', { name: 'removeLogo' }));
        expect(screen.queryByRole('button', { name: /^elements\.logo/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'addLogo' })).toBeInTheDocument();
    });

    it('asks before discarding changes', () => {
        const { onClose } = renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.title/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'alignOptions.left' }));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('discard-open')).toBeInTheDocument();
    });

    it('asks before discarding on Escape from the toolbar', () => {
        const { onClose } = renderEditor();
        fireEvent.focus(screen.getByRole('button', { name: /^elements\.title/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'alignOptions.left' }));
        const reset = screen.getByRole('button', { name: 'reset' });
        // The first Escape deselects, the second asks.
        fireEvent.keyDown(reset, { key: 'Escape' });
        fireEvent.keyDown(reset, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('discard-open')).toBeInTheDocument();
    });
});
