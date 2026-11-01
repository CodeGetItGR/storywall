import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlanModuleGridCell } from '@/components/admin/plans/PlanModuleGridCell';
import messages from '@/messages/en.json';

const VENDORS = { maxVendors: 5, allowedTypes: ['PLANNER', 'MUSIC'], accessDaysAfterEvent: 30, proStorageBytes: 5368709120 };

function renderCell(config: Record<string, unknown>) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <table>
                <tbody>
                    <tr>
                        <PlanModuleGridCell
                            cell={{ planId: 'p1', moduleKey: 'vendors', kind: 'included', config, seedConfig: {} }}
                            failed={false}
                            onClickAction={vi.fn()}
                        />
                    </tr>
                </tbody>
            </table>
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('PlanModuleGridCell', () => {
    it('shows every vendors setting in words, never raw keys or JSON', () => {
        const { container } = renderCell(VENDORS);
        const text = container.textContent ?? '';
        expect(text).toContain('Max vendors 5');
        expect(text).toContain('Vendor types Planner, Music');
        expect(text).toContain('Tool days after the event 30');
        expect(text).toContain('Pro storage 5 GB');
        expect(text).not.toMatch(/maxVendors|allowedTypes|proStorageBytes|\[|\{/);
    });

    it('says All when every type is allowed and None when none is', () => {
        renderCell({ ...VENDORS, allowedTypes: ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER'] });
        expect(screen.getByText('All')).toBeInTheDocument();
        cleanup();
        renderCell({ ...VENDORS, allowedTypes: [] });
        expect(screen.getByText('None')).toBeInTheDocument();
    });
});
