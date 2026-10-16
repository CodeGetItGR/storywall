import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewForm } from '@/components/review/ReviewForm';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

afterEach(cleanup);

function renderForm(onSubmitAction = vi.fn()) {
    render(<ReviewForm eventTitle="Our wedding" isSending={false} error={null} onSubmitAction={onSubmitAction} onNotNowAction={vi.fn()} />);
    return onSubmitAction;
}

function pickStars(count: number) {
    fireEvent.click(screen.getByRole('radio', { name: `star {"count":${count}}` }));
}

describe('ReviewForm', () => {
    it('cannot be sent without a rating', () => {
        renderForm();
        expect((screen.getByRole('button', { name: 'send' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('asks for consent only at four or more stars with a comment', () => {
        renderForm();
        pickStars(5);
        expect(screen.queryByRole('checkbox', { name: 'consent' })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: 'Loved it' } });
        expect(screen.getByRole('checkbox', { name: 'consent' })).toBeTruthy();
        pickStars(3);
        expect(screen.queryByRole('checkbox', { name: 'consent' })).toBeNull();
    });

    it('sends the rating, trimmed comment and consent', () => {
        const onSubmit = renderForm();
        pickStars(4);
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: '  Loved it ' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'consent' }));
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        expect(onSubmit).toHaveBeenCalledWith({ stars: 4, comment: 'Loved it', publicConsent: true });
    });

    it('drops consent that no longer applies', () => {
        const onSubmit = renderForm();
        pickStars(5);
        fireEvent.change(screen.getByRole('textbox', { name: 'comment' }), { target: { value: 'Loved it' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'consent' }));
        pickStars(2);
        fireEvent.click(screen.getByRole('button', { name: 'send' }));
        expect(onSubmit).toHaveBeenCalledWith({ stars: 2, comment: 'Loved it', publicConsent: false });
    });
});
