import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmailCodeInput } from '@/components/event/create/wizard/account/EmailCodeInput';
import { onlyDigits } from '@/lib/emailCode';

afterEach(cleanup);

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
    const [code, setCode] = useState('');
    function handleChange(value: string) {
        setCode(onlyDigits(value));
    }
    return <EmailCodeInput label="6-digit code" value={code} onChange={handleChange} onComplete={onComplete} />;
}

describe('EmailCodeInput', () => {
    it('is one numeric one-time-code field', () => {
        render(<Harness onComplete={vi.fn()} />);
        const input = screen.getByLabelText('6-digit code');
        expect(input).toHaveAttribute('autocomplete', 'one-time-code');
        expect(input).toHaveAttribute('inputmode', 'numeric');
    });

    it('fills all six boxes from a paste and submits on the sixth digit', () => {
        const onComplete = vi.fn();
        render(<Harness onComplete={onComplete} />);
        fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '12 34 56' } });
        expect(screen.getAllByTestId('code-box').map((box) => box.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(onComplete).toHaveBeenCalledWith('123456');
    });
});
