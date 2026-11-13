import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeInput } from '@/components/ui/CodeInput';

afterEach(cleanup);

function Harness({ length, onComplete }: { length: number; onComplete?: (code: string) => void }) {
    const [code, setCode] = useState('');
    return <CodeInput label="Code" length={length} value={code} onChange={setCode} onComplete={onComplete} />;
}

describe('CodeInput', () => {
    it('is one numeric one-time-code field', () => {
        render(<Harness length={6} />);
        const input = screen.getByLabelText('Code');
        expect(input).toHaveAttribute('autocomplete', 'one-time-code');
        expect(input).toHaveAttribute('inputmode', 'numeric');
    });

    it('shows one box per digit', () => {
        render(<Harness length={4} />);
        expect(screen.getAllByTestId('code-box')).toHaveLength(4);
    });

    it('fills every box from a paste, keeps digits only, and reports the full code', () => {
        const onComplete = vi.fn();
        render(<Harness length={6} onComplete={onComplete} />);
        fireEvent.change(screen.getByLabelText('Code'), { target: { value: '12 34-56 78' } });
        expect(screen.getAllByTestId('code-box').map((box) => box.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(onComplete).toHaveBeenCalledWith('123456');
    });

    it('does not report a code that is still short', () => {
        const onComplete = vi.fn();
        render(<Harness length={6} onComplete={onComplete} />);
        fireEvent.change(screen.getByLabelText('Code'), { target: { value: '123' } });
        expect(onComplete).not.toHaveBeenCalled();
    });
});
