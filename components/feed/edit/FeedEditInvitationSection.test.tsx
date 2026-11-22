import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { buildRenderContext } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import en from '@/messages/en.json';

const BABY = SAMPLE_SECTIONS.baby;
const ctx = buildRenderContext(SAMPLE_DOCUMENT, SAMPLE_THEME, () => undefined);
const index = SAMPLE_DOCUMENT.sections.indexOf(BABY);

describe('FeedEditInvitationSection', () => {
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

    it('draws plain text outside the text editor, as on the read-only feed', () => {
        render(
            <div className="smd-invitation">
                <FeedEditInvitationSection section={BABY} index={index} ctx={ctx} />
            </div>,
        );

        const message = screen.getByText('Σας περιμένουμε!');
        expect(message).not.toHaveAttribute('data-smd-text');
        expect(message).not.toHaveAttribute('role');
    });

    it("types a Save my date block's text in place in edit mode", () => {
        const store = createInvitationEditorStore(SAMPLE_DOCUMENT);
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <InlineTextEditing store={store} document={SAMPLE_DOCUMENT} theme={SAMPLE_THEME}>
                    <div className="smd-invitation">
                        <FeedEditInvitationSection section={BABY} index={index} ctx={ctx} />
                    </div>
                </InlineTextEditing>
            </NextIntlClientProvider>,
        );

        const message = screen.getByRole('button', { name: 'Σας περιμένουμε!' });
        expect(message).toHaveAttribute('data-smd-text');

        fireEvent.click(message);
        const active = document.querySelector('.smd-text-active');
        expect(active).toHaveAttribute('contenteditable', 'true');
        expect(screen.getByRole('toolbar', { name: 'Text tools' })).toBeInTheDocument();
    });
});
