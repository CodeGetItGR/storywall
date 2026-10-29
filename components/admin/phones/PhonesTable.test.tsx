import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhonesTable } from '@/components/admin/phones/PhonesTable';
import type { AdminDeviceDto } from '@/lib/api/types';

// Keys come back as-is, with any values after a colon.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
    useLocale: () => 'en',
}));

let opened: (string | undefined)[] = [];

beforeEach(() => {
    opened = [];
});
afterEach(cleanup);

function handleOpen(event: MouseEvent<HTMLButtonElement>) {
    opened.push(event.currentTarget.dataset.deviceId);
}

const devices: AdminDeviceDto[] = [
    { id: 'd1', name: 'Galaxy', createdAt: '2026-10-28T08:00:00Z', lastSeenAt: null, pushEnabled: false },
    { id: 'd2', name: 'Pixel', createdAt: '2026-10-28T09:00:00Z', lastSeenAt: '2026-10-28T10:00:00Z', pushEnabled: true },
];

describe('PhonesTable', () => {
    it('reports the id of the row whose open button was clicked', () => {
        render(<PhonesTable devices={devices} onOpenAction={handleOpen} />);

        fireEvent.click(screen.getByRole('button', { name: 'open:Pixel' }));

        expect(opened).toEqual(['d2']);
    });

    it('shows when a phone was never seen', () => {
        render(<PhonesTable devices={devices} onOpenAction={vi.fn()} />);

        expect(screen.getByText('never')).toBeInTheDocument();
    });
});
