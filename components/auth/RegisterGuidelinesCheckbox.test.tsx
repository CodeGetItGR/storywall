import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RegisterGuidelinesCheckbox } from '@/components/auth/RegisterGuidelinesCheckbox';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('RegisterGuidelinesCheckbox', () => {
    afterEach(cleanup);

    it('is a required checkbox that reports changes', () => {
        const onChange = vi.fn();
        render(<RegisterGuidelinesCheckbox checked={false} onChangeAction={onChange} />);

        const box = screen.getByRole('checkbox');
        expect(box).toBeRequired();
        fireEvent.click(box);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('links to the guidelines in a new tab, and says so to screen readers', () => {
        render(<RegisterGuidelinesCheckbox checked={false} onChangeAction={vi.fn()} />);

        const link = screen.getByRole('link', { name: 'read opensInNewTab' });
        expect(link).toHaveAttribute('href', '/legal/community-guidelines');
        expect(link).toHaveAttribute('target', '_blank');
    });
});
