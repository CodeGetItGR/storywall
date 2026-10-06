import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WISHBOOK_BOOK_TEXT_LIMITS, type WishbookBookTextsDto } from '@/lib/api/types';

import { WishbookBookTextsModal } from './WishbookBookTextsModal';

let texts: WishbookBookTextsDto | undefined;
const save = vi.fn();
const onClose = vi.fn();

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, number>) => (values ? `${key} ${values.current}/${values.max}` : key),
}));
vi.mock('@/components/ui/modal', () => ({
    Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useWishbookBook', () => ({
    useWishbookBookTexts: () => ({ data: texts }),
    useSaveWishbookBookTexts: () => ({ mutateAsync: save, isPending: false, error: null }),
}));

afterEach(cleanup);
beforeEach(() => {
    save.mockReset();
    onClose.mockReset();
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

describe('WishbookBookTextsModal', () => {
    it('shows the defaults as placeholders and the host overrides as values', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        expect(field('subtitle').placeholder).toBe('Our wishes');
        expect(field('subtitle').value).toBe('');
        expect(field('dedication').value).toBe('Thank you\nall');
    });

    it('keeps at most 6 lines in the multiline fields', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        type('dedication', 'a\nb\nc\nd\ne\nf\ng\nh');
        expect(field('dedication').value).toBe('a\nb\nc\nd\ne\nf');
    });

    it('cuts a field at its length limit', () => {
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        type('subtitle', 'x'.repeat(WISHBOOK_BOOK_TEXT_LIMITS.subtitle + 20));
        expect(field('subtitle').value).toHaveLength(WISHBOOK_BOOK_TEXT_LIMITS.subtitle);
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

    it('stays open when the save is refused', async () => {
        save.mockRejectedValue(new Error('nope'));
        render(<WishbookBookTextsModal eventId="e1" onCloseAction={onClose} />);
        fireEvent.click(screen.getByText('save'));
        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(onClose).not.toHaveBeenCalled();
    });
});
