import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { WISHBOOK_BOOK_TEXT_LIMITS, type WishbookBookTextsDto } from '@/lib/api/types';

import { WishbookBookTextsModal } from './WishbookBookTextsModal';

let texts: WishbookBookTextsDto | undefined;
let loadError: unknown = null;
let saveError: unknown = null;
const save = vi.fn();
const onClose = vi.fn();

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: { current?: number; max?: number }) => {
        if (!values) return key;
        return values.current === undefined ? `${key} ${values.max}` : `${key} ${values.current}/${values.max}`;
    },
}));
vi.mock('@/components/ui/modal', () => ({
    Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: ApiError) => `error-${(error.body as { errorCode: number }).errorCode}`,
}));
vi.mock('@/hooks/useWishbookBook', () => ({
    useWishbookBookTexts: () => ({ data: texts, error: loadError, isError: loadError !== null }),
    useSaveWishbookBookTexts: () => ({ mutateAsync: save, isPending: false, error: saveError }),
}));

afterEach(cleanup);
beforeEach(() => {
    save.mockReset();
    onClose.mockReset();
    loadError = null;
    saveError = null;
    texts = {
        subtitle: null,
        dedication: 'Thank you\nall',
        closingTitle: null,
        closingBody: null,
        defaults: { subtitle: 'Our wishes', dedication: 'D', closingTitle: 'CT', closingBody: 'CB' },
    };
});

const field = (name: string) => document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const saveButton = () => screen.getByText('save').closest('button') as HTMLButtonElement;
const counterOf = (name: string) => {
    const ids = (field(name).getAttribute('aria-describedby') ?? '').split(' ');
    return ids.map((id) => document.getElementById(id)).find((element) => element?.textContent?.startsWith('counter')) as HTMLElement;
};

describe('WishbookBookTextsModal', () => {
    it('shows the defaults as placeholders and the host overrides as values', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        expect(field('subtitle').placeholder).toBe('Our wishes');
        expect(field('subtitle').value).toBe('');
        expect(field('dedication').value).toBe('Thank you\nall');
    });

    it('gives the multiline fields room for all six lines', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        expect(field('dedication').getAttribute('rows')).toBe('6');
        expect(field('closingBody').getAttribute('rows')).toBe('6');
    });

    it('links each field to its counter, which sits outside the label', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        const counter = counterOf('subtitle');
        expect(counter.textContent).toBe(`counter 0/${WISHBOOK_BOOK_TEXT_LIMITS.subtitle}`);
        expect(counter.closest('label')).toBeNull();
    });

    it('does not truncate text that is over the line limit; it flags it and blocks Save', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        const typed = 'a\nb\nc\nd\ne\nf\ng\nh';
        type('dedication', typed);
        expect(field('dedication').value).toBe(typed);
        expect(screen.getByText('tooManyLines 6')).toBeTruthy();
        expect(counterOf('dedication').className).toContain('text-rose-600');
        expect(saveButton().disabled).toBe(true);

        type('dedication', 'a\nb');
        expect(screen.queryByText('tooManyLines 6')).toBeNull();
        expect(counterOf('dedication').className).not.toContain('text-rose-600');
        expect(saveButton().disabled).toBe(false);
    });

    it.each([
        ['six plain lines', 'a\nb\nc\nd\ne\nf', false],
        ['six lines with CRLF', 'a\r\nb\r\nc\r\nd\r\ne\r\nf', false],
        ['blank lines around the text do not count', '\n\n\na\nb\n\n\n', false],
        ['a run of blank lines counts once', 'a\n\n\n\n\nb\n\n\n\nc', false],
        ['whitespace-only lines are blank', 'a\n   \n\t\nb', false],
        ['the single blank separators count', 'a\n\nb\n\nc\n\nd', true],
        ['seven plain lines', 'a\nb\nc\nd\ne\nf\ng', true],
    ])('counts lines the way the server does: %s', (_label, value, over) => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        type('closingBody', value);
        expect(saveButton().disabled).toBe(over);
    });

    it('does not truncate text that is over the length limit; it flags it and blocks Save', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        const typed = 'x'.repeat(WISHBOOK_BOOK_TEXT_LIMITS.subtitle + 20);
        type('subtitle', typed);
        expect(field('subtitle').value).toBe(typed);
        expect(counterOf('subtitle').className).toContain('text-rose-600');
        expect(saveButton().disabled).toBe(true);
    });

    it('measures length after the server would trim and collapse spaces', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        type('subtitle', `   ${'x'.repeat(WISHBOOK_BOOK_TEXT_LIMITS.subtitle)}   `);
        expect(saveButton().disabled).toBe(false);
        type('closingTitle', 'ab      cd');
        expect(counterOf('closingTitle').textContent).toBe(`counter 5/${WISHBOOK_BOOK_TEXT_LIMITS.closingTitle}`);
    });

    it('saves all four fields, sending blank ones as null, and closes', async () => {
        save.mockResolvedValue(undefined);
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        type('subtitle', '  A subtitle  ');
        type('closingBody', '   ');
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(save).toHaveBeenCalledWith({ subtitle: 'A subtitle', dedication: 'Thank you\nall', closingTitle: null, closingBody: null });
    });

    it('stays open when the save is refused, and says why', async () => {
        save.mockRejectedValue(new ApiError(400, { errorCode: 3001 }));
        saveError = new ApiError(400, { errorCode: 3001 });
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe('error-3001');
    });

    it('shows why the texts could not be loaded instead of spinning for ever', () => {
        texts = undefined;
        loadError = new ApiError(500, { errorCode: 1234 });
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        expect(screen.getByRole('alert').textContent).toBe('error-1234');
    });
});
