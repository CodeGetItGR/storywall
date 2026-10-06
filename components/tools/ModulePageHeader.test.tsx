import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModulePageHeader } from '@/components/tools/ModulePageHeader';

vi.mock('@/components/ui/BackButton', () => ({ BackButton: () => null }));

afterEach(cleanup);

describe('ModulePageHeader', () => {
    it("titles the page with an event heading, so it takes the theme's font", () => {
        render(<ModulePageHeader title="Gallery" backLabel="Back" backHref="/events/e-1/feed" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Gallery' })).toHaveClass('event-heading', 'text-ink');
    });
});
