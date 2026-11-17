import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ProvisionScheduleItemModal } from '@/components/admin/ProvisionScheduleItemModal';
import { useProvisionSchedule } from '@/hooks/useProvisionSchedule';
import { DEFAULT_CONTENT_LIMITS } from '@/lib/appConfigDefaults';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));
vi.mock('@/hooks/useContentLimits', () => ({ useContentLimits: () => DEFAULT_CONTENT_LIMITS }));

function Harness({ onOuterSubmit }: { onOuterSubmit: () => void }) {
    const schedule = useProvisionSchedule(true);
    const { openNew } = schedule;
    useEffect(() => openNew(), []); // eslint-disable-line react-hooks/exhaustive-deps

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        onOuterSubmit();
    }

    return (
        <form onSubmit={handleSubmit}>
            <ProvisionScheduleItemModal schedule={schedule} />
            <output data-testid="items">{schedule.items.map((item) => `${item.title}:${item.isSecondary}`).join(',')}</output>
        </form>
    );
}

describe('ProvisionScheduleItemModal', () => {
    it('saves the session without submitting the provisioning form around it', async () => {
        const outerSubmit = vi.fn();
        render(<Harness onOuterSubmit={outerSubmit} />);

        const save = await screen.findByRole('button', { name: 'sessionSave' });
        expect((save as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(screen.getByRole('textbox', { name: /title/ }), { target: { value: 'Reception' } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'receptionVenue' }));
        fireEvent.click(save);

        expect(outerSubmit).not.toHaveBeenCalled();
        expect(screen.getByTestId('items').textContent).toBe('Reception:true');
    });
});
