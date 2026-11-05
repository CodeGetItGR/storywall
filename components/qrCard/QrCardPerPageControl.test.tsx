import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardPerPageControl } from '@/components/qrCard/QrCardPerPageControl';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: { count: number }) => (values ? `${key}:${values.count}` : key),
}));

afterEach(cleanup);

describe('QrCardPerPageControl', () => {
    it('offers one card or a full sheet and reports a pick', () => {
        const onChange = vi.fn();
        render(<QrCardPerPageControl perPage="one" sheetCount={4} onChangeAction={onChange} />);

        expect(screen.getByRole('radio', { name: 'one' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'sheet:4' }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('sheet');
    });
});
