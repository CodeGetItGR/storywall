import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderRow(props: Partial<Parameters<typeof FeedEditRow>[0]> = {}) {
    const handlers = { onTheme: vi.fn(), onPreview: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedEditRow saving={false} failed={false} previewing={false} {...handlers} {...props} />
        </NextIntlClientProvider>,
    );
    return handlers;
}

describe('FeedEditRow', () => {
    it('names Theme "Themes", and each button does its job', () => {
        const on = renderRow();
        fireEvent.click(screen.getByRole('button', { name: en.FeedEditor.themes }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.preview }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.cancel }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.save }));
        expect([on.onTheme, on.onPreview, on.onCancel, on.onSave].every((fn) => fn.mock.calls.length === 1)).toBe(true);
    });

    it('runs Themes, the eye, Cancel, Save', () => {
        renderRow();
        const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent);
        expect(names).toEqual([en.FeedEditor.themes, en.InvitationEditor.preview, en.InvitationEditor.cancel, en.InvitationEditor.save]);
    });

    it('turns the eye to Edit while previewing, with Themes out of sight in its place', () => {
        renderRow({ previewing: true });
        expect(screen.getByRole('button', { name: en.FeedEditor.edit })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(en.FeedEditor.themes)).toHaveClass('invisible');
        expect(screen.getByRole('button', { name: en.InvitationEditor.cancel })).toBeTruthy();
        expect(screen.getByRole('button', { name: en.InvitationEditor.save })).toBeTruthy();
    });

    it('has no Theme without a handler, and keeps the eye', () => {
        renderRow({ onTheme: undefined });
        expect(screen.queryByRole('button', { name: en.FeedEditor.themes })).toBeNull();
        expect(screen.getByRole('button', { name: en.InvitationEditor.preview })).toHaveAttribute('aria-pressed', 'false');
    });

    it('says it is saving, and shows the save error under the row', () => {
        renderRow({ saving: true, failed: true });
        expect(screen.getByRole('button', { name: en.InvitationEditor.saving }).getAttribute('aria-busy')).toBe('true');
        expect(screen.getByRole('alert').textContent).toBe(en.FeedEditor.saveFailed);
    });
});
