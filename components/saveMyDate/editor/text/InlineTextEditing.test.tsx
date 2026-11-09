import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { InvitationText } from '@/components/saveMyDate/invitation/InvitationText';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import { readText, type TextTarget } from '@/lib/invitation/textEditing';
import en from '@/messages/en.json';

const MESSAGE: TextTarget = { kind: 'field', sectionId: 's-baby', path: 'babyMessage' };
const TITLE: TextTarget = { kind: 'element', elementId: 'e-inv-title' };

function Texts() {
    return (
        <div className="smd-invitation">
            <InvitationText target={MESSAGE} value="Σας περιμένουμε!" tag="p" className="text-block" style={{}} />
            <InvitationText target={TITLE} value="" tag="div" className="text-block" style={{ fontSize: 32 }} />
        </div>
    );
}

describe('InvitationText', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                disconnect() {}
            },
        );
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('is plain text on a guest page', () => {
        render(<Texts />);
        const message = screen.getByText('Σας περιμένουμε!');
        expect(message.tagName).toBe('P');
        expect(message).not.toHaveAttribute('role');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('opens for typing in the editor, by tap or by key', () => {
        const store = createInvitationEditorStore(SAMPLE_DOCUMENT);
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <InlineTextEditing store={store} document={SAMPLE_DOCUMENT} theme={SAMPLE_THEME}>
                    <Texts />
                </InlineTextEditing>
            </NextIntlClientProvider>,
        );

        // An empty text stays a box to tap, named for screen readers.
        const empty = screen.getByRole('button', { name: 'Empty text' });
        expect(empty).toHaveClass('smd-text-empty');

        fireEvent.keyDown(screen.getByRole('button', { name: 'Σας περιμένουμε!' }), { key: 'Enter' });
        const active = document.querySelector('.smd-text-active')!;
        expect(active.tagName).toBe('P');
        expect(active).toHaveAttribute('contenteditable', 'true');
        expect(active).toHaveFocus();
        expect(screen.getByRole('toolbar', { name: 'Text tools' })).toBeInTheDocument();

        act(() => {
            fireEvent.keyDown(active, { key: 'Escape' });
        });
        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
        expect(readText(store.getState().document, MESSAGE)).toBeDefined();
    });
});
