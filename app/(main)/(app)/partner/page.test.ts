// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import PartnerPage from './page';

const permanentRedirect = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ permanentRedirect }));

describe('/partner', () => {
    it('sends the old partner page to the business page for good', () => {
        PartnerPage();
        expect(permanentRedirect).toHaveBeenCalledWith('/business');
    });
});
