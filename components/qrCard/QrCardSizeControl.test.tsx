import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardSizeControl } from '@/components/qrCard/QrCardSizeControl';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('QrCardSizeControl', () => {
    it('hides with one size', () => {
        const { container } = render(<QrCardSizeControl sizes={['A6']} size="A6" onChangeAction={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('offers both sizes and reports a pick', () => {
        const onChange = vi.fn();
        render(<QrCardSizeControl sizes={['A6', 'A5']} size="A6" onChangeAction={onChange} />);
        expect(screen.getByRole('radio', { name: 'A6' })).toBeChecked();
        fireEvent.click(screen.getByRole('radio', { name: 'A5' }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].target.value).toBe('A5');
    });

    // An unanchored hidden radio sits outside the page's scroller: focusing it scrolls the whole app shell.
    it('anchors each hidden radio to its label', () => {
        render(<QrCardSizeControl sizes={['A6', 'A5']} size="A6" onChangeAction={vi.fn()} />);
        expect(screen.getByRole('radio', { name: 'A5' }).closest('label')).toHaveClass('relative');
    });
});
