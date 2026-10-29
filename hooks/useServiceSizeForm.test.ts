import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useServiceSizeForm } from '@/hooks/useServiceSizeForm';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));

const size = { id: 's1', kind: 'PRINT' as const, label: '13x18', priceCents: 350, currency: 'EUR', sortOrder: 0 };

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}
function changeEvent(value: string) {
    return { currentTarget: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe('useServiceSizeForm', () => {
    it('starts empty for a new size and from the size when editing', () => {
        const added = renderHook(() => useServiceSizeForm({ item: 'new', onSave: vi.fn() }));
        expect(added.result.current).toMatchObject({ label: '', price: '', isEditing: false, labelError: null, priceError: null });
        const edited = renderHook(() => useServiceSizeForm({ item: size, onSave: vi.fn() }));
        expect(edited.result.current).toMatchObject({ label: '13x18', price: '3.50', isEditing: true });
    });

    it('saves the trimmed label and the price in cents', () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useServiceSizeForm({ item: 'new', onSave }));
        act(() => result.current.handleLabel(changeEvent(' 10x15 ')));
        act(() => result.current.handlePrice(changeEvent('2,5')));
        act(() => result.current.handleSubmit(submitEvent()));
        expect(onSave).toHaveBeenCalledWith('10x15', 250);
    });

    it('shows no error before the first submit, then one per bad field', () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => useServiceSizeForm({ item: 'new', onSave }));
        act(() => result.current.handlePrice(changeEvent('abc')));
        expect(result.current.priceError).toBeNull();
        act(() => result.current.handleSubmit(submitEvent()));
        expect(onSave).not.toHaveBeenCalled();
        expect(result.current.labelError).toBe('labelRequired');
        expect(result.current.priceError).toBe('priceInvalid');
    });

    it('says a price above the limit is too high, with the limit', () => {
        const { result } = renderHook(() => useServiceSizeForm({ item: size, onSave: vi.fn() }));
        act(() => result.current.handlePrice(changeEvent('1000.01')));
        act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.priceError).toBe('priceTooHigh:{"max":"€1,000.00"}');
    });

    it('rejects a label over 40 characters', () => {
        const { result } = renderHook(() => useServiceSizeForm({ item: size, onSave: vi.fn() }));
        act(() => result.current.handleLabel(changeEvent('x'.repeat(41))));
        expect(result.current.canSubmit).toBe(false);
    });
});
