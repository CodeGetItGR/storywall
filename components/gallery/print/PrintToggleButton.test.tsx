import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintToggleButton } from '@/components/gallery/print/PrintToggleButton';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const toggle = { picked: false, pending: false, disabled: false, error: null, onToggle: vi.fn() };

afterEach(cleanup);

describe('PrintToggleButton', () => {
    it('shows Print while not picked', () => {
        render(<PrintToggleButton toggle={toggle} />);
        const button = screen.getByRole('button', { name: 'action' });
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button).toHaveTextContent('action');
    });

    it('keeps the short label when picked and announces the full one', () => {
        render(<PrintToggleButton toggle={{ ...toggle, picked: true }} />);
        const button = screen.getByRole('button', { name: 'picked' });
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button).toHaveTextContent('action');
        expect(button).not.toHaveTextContent('picked');
    });

    it('shows a check icon when picked and the printer when not', () => {
        const { container, rerender } = render(<PrintToggleButton toggle={{ ...toggle, picked: true }} />);
        expect(container.querySelector('svg.lucide-check')).not.toBeNull();
        expect(container.querySelector('svg.lucide-printer')).toBeNull();
        rerender(<PrintToggleButton toggle={toggle} />);
        expect(container.querySelector('svg.lucide-printer')).not.toBeNull();
    });

    it('is disabled with a spinner while pending', () => {
        const { container } = render(<PrintToggleButton toggle={{ ...toggle, picked: true, pending: true }} />);
        expect(screen.getByRole('button')).toBeDisabled();
        expect(container.querySelector('svg.animate-spin')).not.toBeNull();
        expect(container.querySelector('svg.lucide-check')).toBeNull();
    });
});
