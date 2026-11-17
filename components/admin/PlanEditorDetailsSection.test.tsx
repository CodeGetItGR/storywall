import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlanEditorDetailsSection } from '@/components/admin/PlanEditorDetailsSection';
import type { PlanTierResponseDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useLocalizedText', () => ({ useLocalizedText: () => (value: string) => value }));

const WARNING = messages.AdminPage.fields.nameLengthWarning.replace('{count}', '12');

function renderSection(name: string) {
    const plan = { id: 'p1', code: 'PLAN', name, description: null, eventTypeKey: 'WEDDING' } as unknown as PlanTierResponseDto;
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <PlanEditorDetailsSection id="details" plan={plan} eventTypes={[]} siblings={[]} />
        </NextIntlClientProvider>,
    );
    return screen.getByRole('textbox', { name: new RegExp(messages.AdminPage.fields.name) });
}

describe('PlanEditorDetailsSection name warning', () => {
    afterEach(cleanup);

    it('stays quiet for a name of 12 characters', () => {
        renderSection('Social Vibes');
        expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    });

    it('warns when the saved name is already too long', () => {
        renderSection('Social Premium');
        expect(screen.getByText(WARNING)).toBeInTheDocument();
    });

    it('follows the name as it is edited', () => {
        const input = renderSection('Premium');
        fireEvent.change(input, { target: { value: 'Social Signature' } });
        expect(screen.getByText(WARNING)).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'Signature' } });
        expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    });

    it('does not count spaces around the name', () => {
        const input = renderSection('Premium');
        fireEvent.change(input, { target: { value: '  Social Vibes  ' } });
        expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
    });
});
