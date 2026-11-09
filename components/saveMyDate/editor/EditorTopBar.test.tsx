import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorTopBar } from '@/components/saveMyDate/editor/EditorTopBar';
import type { SaveStatus } from '@/lib/invitation/draftAutosave';
import en from '@/messages/en.json';

type Props = Parameters<typeof EditorTopBar>[0];

function renderBar(props: Partial<Props> = {}) {
    const handlers = { onBack: vi.fn(), onUndo: vi.fn(), onRedo: vi.fn(), onPreview: vi.fn(), onPublish: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <EditorTopBar status="saved" canUndo canRedo {...handlers} {...props} />
        </NextIntlClientProvider>,
    );
    return handlers;
}

describe('EditorTopBar', () => {
    afterEach(cleanup);

    it('runs each action', () => {
        const handlers = renderBar();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

        for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledOnce();
    });

    it('turns off undo and redo with nothing to step through', () => {
        renderBar({ canUndo: false, canRedo: false });
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    });

    it('waits while a save the next step needs is on its way', () => {
        renderBar({ isBusy: true });
        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    });

    it.each<[SaveStatus, string]>([
        ['saved', 'Saved'],
        ['saving', 'Saving…'],
        ['unsaved', 'Unsaved changes'],
    ])('says %s', (status, label) => {
        renderBar({ status });
        expect(screen.getByRole('status')).toHaveTextContent(label);
    });

    it.each<SaveStatus>(['error', 'conflict'])('leaves %s to its own message', (status) => {
        renderBar({ status });
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
});
