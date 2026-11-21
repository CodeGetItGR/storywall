import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OccasionPage } from '@/components/occasions/OccasionPage';
import { OccasionStoryContent } from '@/components/occasions/sections/OccasionStoryContent';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { getLandingThemes } from '@/lib/landingThemes';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import { findOccasion } from '@/lib/occasions/occasions';
import { occasionPageConfig } from '@/lib/occasions/pageConfig';
import { routes } from '@/lib/routes';

vi.mock('next-intl/server', () => import('@/components/occasions/sections/__fixtures__/intlServerMock'));
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicConfigGet: vi.fn() }));
vi.mock('@/lib/occasions/demoPreview.server', () => ({ loadOccasionDemoPreview: vi.fn(async () => null) }));
vi.mock('@/lib/landingThemes', () => ({ getLandingThemes: vi.fn(async () => []) }));
// The page is checked by which layout it hands its props to; each layout has its own tests.
vi.mock('@/components/occasions/OccasionContent', () => ({ OccasionContent: () => null }));
vi.mock('@/components/occasions/sections/OccasionStoryContent', () => ({ OccasionStoryContent: () => null }));
vi.mock('@/lib/occasions/occasionFeatures', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/occasions/occasionFeatures')>()),
    occasionOffersThemes: vi.fn(() => true),
}));
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
    vi.mocked(getLandingThemes).mockClear();
});

describe('OccasionPage', () => {
    it('renders the wedding page with its demo and QR links, no themes and no demo snapshot', async () => {
        const wedding = await layout('WEDDING');
        expect(wedding.type).toBe(OccasionStoryContent);
        expect(wedding.props).toMatchObject({
            config: occasionPageConfig('WEDDING'),
            demoHref: routes.demoEventType(eventTypeSlug('WEDDING')),
            length: { lengths: 'none', extendable: 'no' },
            price: { range: 'none' },
            qrHref: '/el/qr-code-gamou',
            themes: null,
        });
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
        expect(getLandingThemes).not.toHaveBeenCalled();
    });

    it('renders the baptism page with its themes, and without demo or QR links', async () => {
        const baptism = await layout('BAPTISM');
        expect(baptism.type).toBe(OccasionStoryContent);
        expect(baptism.props).toMatchObject({ config: occasionPageConfig('BAPTISM'), demoHref: null, qrHref: null, themes: [] });
        expect(getLandingThemes).toHaveBeenCalledWith('BAPTISM', 'el');
        expect(loadOccasionDemoPreview).not.toHaveBeenCalled();
    });
});
