import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemeStylePanel } from '@/components/saveMyDate/editor/themeStyle/ThemeStylePanel';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { invitationTypographyPresetKeys } from '@/hooks/useInvitationTypographyPresets';
import { useThemeStyle } from '@/hooks/useThemeStyle';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { DEFAULT_BUTTON_TEXT, type TypographyPresetOption } from '@/lib/invitation/themeEditing';
import { PREVIEW_THEME, previewDocument } from '@/lib/saveMyDatePreview';
import en from '@/messages/en.json';

const PRESETS: TypographyPresetOption[] = [{ id: 'classic', name: 'Classic', titleFont: 'Georgia', bodyFont: 'Arial', buttonFont: null }];

// The rendered editor's store, so a test can read the theme it holds.
let currentStore: InvitationEditorStore | undefined;

function Panel({ initial }: { initial: ThemeDesign }) {
    const editor = useInvitationEditorStore(previewDocument(), initial);
    useEffect(() => {
        currentStore = editor.store;
    }, [editor.store]);
    const style = useThemeStyle({ store: editor.store, design: editor.theme!, document: editor.document, eventType: 'WEDDING' });
    return <ThemeStylePanel style={style} />;
}

function renderPanel(initial: ThemeDesign = PREVIEW_THEME) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(invitationTypographyPresetKeys.list('WEDDING'), PRESETS);
    render(
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={en}>
                <Panel initial={initial} />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
    return { theme: () => currentStore!.getState().theme! };
}

describe('ThemeStylePanel', () => {
    afterEach(cleanup);

    it('changes the main colour', () => {
        const { theme } = renderPanel();
        fireEvent.change(screen.getByLabelText('Main color'), { target: { value: '#112233' } });
        expect(theme().colors.primary).toBe('#112233');
    });

    it('shows the button defaults and offers Reset only for a colour of its own', () => {
        renderPanel({ ...PREVIEW_THEME, colors: { ...PREVIEW_THEME.colors, buttonBg: undefined, buttonText: undefined } });
        expect(screen.getByLabelText('Button text color')).toHaveValue(DEFAULT_BUTTON_TEXT);
        expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Button fill'), { target: { value: '#445566' } });
        expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
    });

    it('resets a button colour back to the main colour', () => {
        const { theme } = renderPanel({ ...PREVIEW_THEME, colors: { ...PREVIEW_THEME.colors, buttonBg: '#445566' } });
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(theme().colors.buttonBg).toBeUndefined();
        expect(screen.getByLabelText('Button fill')).toHaveValue(PREVIEW_THEME.colors.primary.toLowerCase());
    });

    it('applies a font style and goes back to Custom when a font is picked by hand', () => {
        const { theme } = renderPanel();
        fireEvent.change(screen.getByLabelText('Font style'), { target: { value: 'classic' } });
        expect(theme()).toMatchObject({ typographyPresetId: 'classic', fonts: { title: 'Georgia', body: 'Arial' } });

        fireEvent.change(screen.getByLabelText('Body font'), { target: { value: screen.getAllByRole('option', { name: 'Times New Roman' })[0].getAttribute('value') } });
        expect(theme().typographyPresetId).toBeUndefined();
        expect(screen.getByLabelText('Font style')).toHaveValue('');
    });

    it('sets the photo shape, background mode and auto contrast', () => {
        const { theme } = renderPanel();
        fireEvent.change(screen.getByLabelText('Photo shape'), { target: { value: 'oval' } });
        fireEvent.change(screen.getByLabelText('Background 2'), { target: { value: 'repeat' } });
        fireEvent.click(screen.getByLabelText('Automatic contrast on dark backgrounds'));
        expect(theme().photoShape).toBe('oval');
        expect(theme().backgrounds.content.mode).toBe('repeat');
        expect(theme().autoTextContrast).toBe(!PREVIEW_THEME.autoTextContrast);
    });
});
