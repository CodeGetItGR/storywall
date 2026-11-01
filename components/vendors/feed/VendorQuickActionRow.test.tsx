import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VendorActionKey } from '@/lib/vendors';

import { VendorQuickActionRow } from './VendorQuickActionRow';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const actions = (keys: VendorActionKey[]) => keys.map((key) => ({ key, href: `/events/e1/${key}` }));

describe('VendorQuickActionRow', () => {
    afterEach(cleanup);

    it('shows one tool as a single full-width link', () => {
        render(<VendorQuickActionRow actions={actions(['liveRequests'])} />);

        expect(screen.queryByRole('list')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'quickActions.liveRequests' })).toHaveAttribute('href', '/events/e1/liveRequests');
    });

    it('puts two tools side by side', () => {
        render(<VendorQuickActionRow actions={actions(['proAlbum', 'prints'])} />);

        expect(screen.getByRole('list')).toHaveClass('grid-cols-2');
        expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    it('lists three or more as a sideways-scrolling row', () => {
        render(<VendorQuickActionRow actions={actions(['schedule', 'announcement', 'rsvpReport', 'qr'])} />);

        expect(screen.getByRole('list')).toHaveClass('overflow-x-auto');
        expect(screen.getAllByRole('link')).toHaveLength(4);
    });
});
