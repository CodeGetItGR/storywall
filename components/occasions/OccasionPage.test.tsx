import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionPage } from '@/components/occasions/OccasionPage';
import { WeddingContent } from '@/components/occasions/wedding/WeddingContent';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import { findOccasion } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: vi.fn() }));
vi.mock('@/lib/occasions/demoPreview.server', () => ({ loadOccasionDemoPreview: vi.fn(async () => null) }));
vi.mock('@/lib/landingThemes', () => ({ getLandingThemes: vi.fn(async () => []) }));
// The page is checked by which layout it hands its props to; each layout has its own tests.
vi.mock('@/components/occasions/OccasionContent', () => ({ OccasionContent: () => null }));
vi.mock('@/components/occasions/wedding/WeddingContent', () => ({ WeddingContent: () => null }));
vi.mock('@/components/occasions/OccasionStructuredData', () => ({ OccasionStructuredData: () => null }));

// Both types on, both with a demo, no plans on sale.
const CONFIG = {
    eventTypes: [
        { eventTypeKey: 'WEDDING', isEnabled: true, hasDemo: true },
        { eventTypeKey: 'BAPTISM', isEnabled: true, hasDemo: true },
    ],
    memberRolesByEventType: {},
    modules: [],
    planTiers: [],
} as unknown as AppConfigResponseDto;

// The layout element under the hydration boundary, after the structured data.
async function layout(eventType: 'WEDDING' | 'BAPTISM') {
    const page = await OccasionPage({ locale: 'el', occasion: findOccasion(eventType)! });
    return (page.props as { children: ReactElement<Record<string, unknown>>[] }).children[1]!;
}

beforeEach(() => {
    vi.mocked(serverPublicConfigGet).mockResolvedValue(CONFIG);
    vi.mocked(loadOccasionDemoPreview).mockClear();
});

describe('OccasionPage', () => {
    it('renders the wedding layout with its prices, lengths, demo and QR links, and no demo snapshot', async () => {
        const wedding = await layout('WEDDING');
        expect(wedding.type).toBe(WeddingContent);
        expect(wedding.props).toMatchObject({
            demoHref: routes.demoEventType(eventTypeSlug('WEDDING')),
            length: { lengths: 'none', extendable: 'no' },
            price: { range: 'none' },
            qrHref: '/el/qr-code-gamou',
        });
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
    });

    it('keeps every other occasion on the shared layout', async () => {
        const baptism = await layout('BAPTISM');
        expect(baptism.type).toBe(OccasionContent);
        expect(loadOccasionDemoPreview).toHaveBeenCalledWith('BAPTISM', 'el');
    });
});
