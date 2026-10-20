import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import type { UseRightContextPanelResult } from '@/hooks/useRightContextPanel';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/layout/right-context-panel/MediaSummarySection', () => ({ MediaSummarySection: () => null }));
vi.mock('@/components/layout/right-context-panel/QrLinksSection', () => ({ QrLinksSection: () => null }));
vi.mock('@/components/layout/right-context-panel/RsvpSummarySection', () => ({ RsvpSummarySection: () => null }));
vi.mock('@/components/layout/right-context-panel/WishbookSummarySection', () => ({ WishbookSummarySection: () => null }));
vi.mock('@/components/plan/UsagePanel', () => ({ UsagePanel: () => <p>usage</p> }));
vi.mock('@/components/vendors/ProStorageMeter', () => ({ ProStorageMeter: ({ usedBytes }: { usedBytes: number }) => <p>pro {usedBytes}</p> }));

function panel(usage: Record<string, unknown>) {
    return {
        activeEvent: { id: 'e1' },
        eventUsage: { planTier: 'PLUS', storageBytes: 0, storageLimitBytes: null, storagePercent: 0, memberCount: 0, memberLimit: null, memberPercent: 0, ...usage },
        currentPlan: undefined,
        nextUpgradeOption: undefined,
        includedModuleKeys: [],
        actionItems: [],
        showRsvpSummary: false,
        showMediaSummary: false,
        showGalleryQr: false,
        showInvitationsQr: false,
        showWishbookSummary: false,
    } as unknown as UseRightContextPanelResult;
}

afterEach(cleanup);

describe('HostContextSections Pro meter', () => {
    it('shows the Pro meter next to event storage when the plan has a Pro allowance', () => {
        render(<HostContextSections panel={panel({ proStorageBytes: 100, proUsedBytes: 40 })} />);
        expect(screen.getByText('usage')).toBeTruthy();
        expect(screen.getByText('pro 40')).toBeTruthy();
    });

    it('shows no Pro meter without one', () => {
        render(<HostContextSections panel={panel({ proStorageBytes: 0, proUsedBytes: 0 })} />);
        expect(screen.queryByText(/^pro /)).toBeNull();
    });
});
