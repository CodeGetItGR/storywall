import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiteFloatingWish } from '@/components/event/create/wizard/details/LitePlanPieces';
import type { useLitePlanArt } from '@/hooks/useLitePlanArt';

vi.mock('next-intl', () => ({ useLocale: () => 'el', useTranslations: () => (key: string) => key }));

const WISH_DATE = '2026-11-14T18:30:00.000Z';

const art = {
    wishes: [{ author: 'Maria', message: 'Congratulations!' }],
    wishDate: WISH_DATE,
} as unknown as ReturnType<typeof useLitePlanArt>;

describe('LiteFloatingWish', () => {
    it('shows the wish’s date in the app’s language', () => {
        const { container } = render(<LiteFloatingWish art={art} index={0} scale={1} />);

        const time = container.querySelector('time');
        expect(time?.textContent).toBe(new Intl.DateTimeFormat('el', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(WISH_DATE)));
        expect(time?.textContent).toMatch(/Νοε/);
    });
});
