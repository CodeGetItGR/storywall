import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerPromptCard } from '@/components/vendors/me/PartnerPromptCard';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/vendors/BecomePartnerSheet', () => ({ BecomePartnerSheet: ({ open }: { open: boolean }) => (open ? <p>sheet</p> : null) }));
const partner = vi.hoisted(() => ({
    value: { defaults: {}, search: '?x', sheetOpen: false, openSheet: vi.fn(), closeSheet: vi.fn(), dismiss: vi.fn(), isDismissing: false },
}));
vi.mock('@/hooks/useBecomePartner', () => ({ useBecomePartner: () => partner.value }));

afterEach(cleanup);

describe('PartnerPromptCard', () => {
    it('applies and dismisses', () => {
        render(<PartnerPromptCard />);
        fireEvent.click(screen.getByRole('button', { name: 'partner.promptApply' }));
        expect(partner.value.openSheet).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'partner.promptDismiss' }));
        expect(partner.value.dismiss).toHaveBeenCalled();
    });
});
