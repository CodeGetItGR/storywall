import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditRow } from '@/components/feed/edit/FeedEditRow';
import en from '@/messages/en.json';

afterEach(cleanup);

function renderRow(props: Partial<Parameters<typeof FeedEditRow>[0]> = {}) {
    const handlers = { onTheme: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <FeedEditRow saving={false} failed={false} {...handlers} {...props} />
        </NextIntlClientProvider>,
    );
    return handlers;
}

describe('FeedEditRow', () => {
    it('names Theme "Themes", and each button does its job', () => {
        const on = renderRow();
        fireEvent.click(screen.getByRole('button', { name: en.FeedEditor.themes }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.cancel }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.save }));
        expect([on.onTheme, on.onCancel, on.onSave].every((fn) => fn.mock.calls.length === 1)).toBe(true);
    });

    it('has no Theme without a handler', () => {
        renderRow({ onTheme: undefined });
        expect(screen.queryByRole('button', { name: en.FeedEditor.themes })).toBeNull();
    });

    it('says it is saving, and shows the save error under the row', () => {
        renderRow({ saving: true, failed: true });
        expect(screen.getByRole('button', { name: en.InvitationEditor.saving }).getAttribute('aria-busy')).toBe('true');
        expect(screen.getByRole('alert').textContent).toBe(en.FeedEditor.saveFailed);
    });
});
