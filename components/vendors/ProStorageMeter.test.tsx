import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProStorageMeter } from '@/components/vendors/ProStorageMeter';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/lib/format', () => ({ formatBytes: (bytes: number) => `${bytes}B` }));

afterEach(cleanup);

describe('ProStorageMeter', () => {
    it('shows used / total below the allowance, with no overflow line', () => {
        render(<ProStorageMeter usedBytes={20} allowanceBytes={100} />);
        expect(screen.getByText('value:{"used":"20B","total":"100B"}')).toBeTruthy();
        expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('20');
        expect(screen.queryByText(/^over:/)).toBeNull();
    });

    it('shows its label by default and can hide it while keeping the accessible name', () => {
        const { rerender } = render(<ProStorageMeter usedBytes={20} allowanceBytes={100} />);
        expect(screen.getByText('label')).toBeTruthy();

        rerender(<ProStorageMeter usedBytes={20} allowanceBytes={100} hideLabel />);
        expect(screen.queryByText('label')).toBeNull();
        expect(screen.getByRole('meter').getAttribute('aria-label')).toBe('label');
        expect(screen.getByText('value:{"used":"20B","total":"100B"}')).toBeTruthy();
    });

    it('is full with no overflow line at the allowance', () => {
        render(<ProStorageMeter usedBytes={100} allowanceBytes={100} />);
        expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('100');
        expect(screen.queryByText(/^over:/)).toBeNull();
    });

    it('names the overflow that counts as event storage', () => {
        render(<ProStorageMeter usedBytes={130} allowanceBytes={100} />);
        expect(screen.getByText('over:{"over":"30B"}')).toBeTruthy();
    });

    it('stays empty and finite with a zero allowance and no use', () => {
        render(<ProStorageMeter usedBytes={0} allowanceBytes={0} />);
        expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0');
        expect(screen.queryByText(/^over:/)).toBeNull();
    });
});
