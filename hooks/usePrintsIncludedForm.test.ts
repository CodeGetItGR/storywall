import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePrintsIncludedForm } from '@/hooks/usePrintsIncludedForm';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}
function changeEvent(value: string) {
    return { currentTarget: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe('usePrintsIncludedForm', () => {
    it('starts from the saved count with no error', () => {
        const { result } = renderHook(() => usePrintsIncludedForm({ initial: 12, onSave: vi.fn() }));
        expect(result.current.value).toBe('12');
        expect(result.current.error).toBeNull();
        expect(result.current.canSubmit).toBe(true);
    });

    it('saves a whole number', () => {
        const onSave = vi.fn();
        const { result } = renderHook(() => usePrintsIncludedForm({ initial: 1, onSave }));
        act(() => result.current.handleChange(changeEvent(' 40 ')));
        act(() => result.current.handleSubmit(submitEvent()));
        expect(onSave).toHaveBeenCalledWith(40);
    });

    it.each(['', '-1', '1.5', '10000', 'abc', '1e2'])('rejects %j with a message and does not save', (text) => {
        const onSave = vi.fn();
        const { result } = renderHook(() => usePrintsIncludedForm({ initial: 1, onSave }));
        act(() => result.current.handleChange(changeEvent(text)));
        expect(result.current.canSubmit).toBe(false);
        expect(result.current.error).toBe('includedInvalid:{"max":9999}');
        act(() => result.current.handleSubmit(submitEvent()));
        expect(onSave).not.toHaveBeenCalled();
    });

    it('accepts 0 and 9999', () => {
        const { result } = renderHook(() => usePrintsIncludedForm({ initial: 1, onSave: vi.fn() }));
        act(() => result.current.handleChange(changeEvent('0')));
        expect(result.current.canSubmit).toBe(true);
        act(() => result.current.handleChange(changeEvent('9999')));
        expect(result.current.canSubmit).toBe(true);
    });
});
