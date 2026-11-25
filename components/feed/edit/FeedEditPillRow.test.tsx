import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditPillRow } from '@/components/feed/edit/FeedEditPillRow';
import en from '@/messages/en.json';

afterEach(cleanup);

const row = (editing: boolean, onEdit = vi.fn()) => (
    <NextIntlClientProvider locale="en" messages={en}>
        <FeedEditPillRow editing={editing} onEdit={onEdit} />
    </NextIntlClientProvider>
);

describe('FeedEditPillRow', () => {
    it('starts edit mode', () => {
        const onEdit = vi.fn();
        render(row(false, onEdit));
        fireEvent.click(screen.getByRole('button', { name: en.FeedEditor.edit }));
        expect(onEdit).toHaveBeenCalledOnce();
    });

    it('keeps its room without the pill while edit mode loads', () => {
        const { container, rerender } = render(row(false));
        const shape = (container.firstElementChild as HTMLElement).className;
        rerender(row(true));
        expect(screen.queryByRole('button')).toBeNull();
        expect((container.firstElementChild as HTMLElement).className).toBe(shape);
    });
});
