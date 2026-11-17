import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MembersUsageTiles } from './MembersUsageTiles';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useActiveModuleCopy: () => ({ name: 'Co-hosts' }) }));

afterEach(cleanup);

describe('MembersUsageTiles', () => {
    it('shows both tiles with used / limit', () => {
        render(<MembersUsageTiles members={{ used: 58, limit: 100, percent: 58 }} coHosts={{ used: 1, limit: 2, percent: 50 }} notices={[]} />);
        expect(screen.getByText('items.members')).toBeInTheDocument();
        expect(screen.getByText('Co-hosts')).toBeInTheDocument();
        expect(screen.getByText('58')).toBeInTheDocument();
        expect(screen.getByText('/ 100')).toBeInTheDocument();
    });

    it('leaves out the co-hosts tile when the plan has none', () => {
        render(<MembersUsageTiles members={{ used: 3, limit: 100, percent: 3 }} coHosts={null} notices={[]} />);
        expect(screen.queryByText('Co-hosts')).toBeNull();
    });

    it('says unlimited instead of a bar when there is no limit', () => {
        render(<MembersUsageTiles members={{ used: 3, limit: null, percent: 0 }} coHosts={null} notices={[]} />);
        expect(screen.getByText('unlimited')).toBeInTheDocument();
    });

    it('shows the limit notices under the tiles', () => {
        render(<MembersUsageTiles members={{ used: 100, limit: 100, percent: 100 }} coHosts={null} notices={['Guest limit reached']} />);
        expect(screen.getByText('Guest limit reached')).toBeInTheDocument();
    });
});
