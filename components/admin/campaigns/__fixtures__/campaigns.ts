import type { CampaignCountsDto, CampaignDto, CampaignLinkDto, CampaignListDto, CampaignListItemDto } from '@/lib/api/types';

export function countsFixture(overrides: Partial<CampaignCountsDto> = {}): CampaignCountsDto {
    return {
        visits: 0,
        visitors: 0,
        createClicks: 0,
        plansClicks: 0,
        planPicks: 0,
        signedUp: 0,
        createdEvent: 0,
        paidHost: 0,
        sales: 0,
        salesRevenueMinorByCurrency: {},
        ...overrides,
    };
}

export function campaignFixture(overrides: Partial<CampaignDto> = {}): CampaignDto {
    return {
        id: 'launch',
        name: 'Launch 50%',
        linkName: 'launch50',
        status: 'LIVE',
        startsAt: '2026-06-01T07:00:00Z',
        endsAt: '2026-06-30T20:59:00Z',
        archivedAt: null,
        discount: {
            id: 'discount-1',
            percent: 50,
            label: 'Launch offer',
            startsAt: '2026-06-01T07:00:00Z',
            endsAt: '2026-06-30T20:59:00Z',
            status: 'LIVE',
        },
        linkCount: 4,
        createdAt: '2026-05-25T09:00:00Z',
        ...overrides,
    };
}

// Visitors on each of the 30 days up to Storybook's clock (17 May to 15 June), rising when `rising`.
export function dailyFixture(rising: boolean, scale = 10) {
    return Array.from({ length: 30 }, (_, index) => ({
        date: new Date(Date.UTC(2026, 4, 17 + index)).toISOString().slice(0, 10),
        visitors: scale === 0 ? 0 : Math.max(0, Math.round((rising ? index : 30 - index) * scale * 0.1 + (index % 3))),
    }));
}

export function linkFixture(overrides: Partial<CampaignLinkDto> = {}): CampaignLinkDto {
    return {
        id: 'link-1',
        name: 'Instagram story · EL',
        destinationPath: '/el',
        utmSource: 'instagram',
        utmMedium: 'social',
        utmCampaign: 'launch50-story-el',
        createdAt: '2026-05-25T09:00:00Z',
        linkGroup: null,
        destinationAnchor: 'pricing',
        shortCode: 'instagram-organic-launch50-story-el',
        campaignId: 'launch',
        ...overrides,
    };
}

const ITEMS: CampaignListItemDto[] = [
    {
        campaign: campaignFixture(),
        current: countsFixture({
            visits: 1460,
            visitors: 1240,
            plansClicks: 410,
            createClicks: 220,
            planPicks: 130,
            signedUp: 64,
            createdEvent: 41,
            paidHost: 18,
            sales: 21,
            salesRevenueMinorByCurrency: { EUR: 104900 },
        }),
        previous: countsFixture({ visits: 1010, visitors: 890, signedUp: 40, sales: 9, salesRevenueMinorByCurrency: { EUR: 44100 } }),
        daily: dailyFixture(true, 6),
    },
    {
        campaign: campaignFixture({
            id: 'autumn',
            name: 'Autumn posts',
            linkName: 'autumn',
            startsAt: null,
            endsAt: null,
            discount: null,
            linkCount: 6,
        }),
        current: countsFixture({ visits: 610, visitors: 540, signedUp: 12, sales: 3, salesRevenueMinorByCurrency: { EUR: 14700 } }),
        previous: countsFixture({ visits: 700, visitors: 620, signedUp: 15, sales: 3, salesRevenueMinorByCurrency: { EUR: 14700 } }),
        daily: dailyFixture(false, 3),
    },
    {
        campaign: campaignFixture({
            id: 'wedding-fair',
            name: 'Wedding fair',
            linkName: 'wedding-fair',
            status: 'SCHEDULED',
            startsAt: '2026-07-04T07:00:00Z',
            endsAt: '2026-07-06T20:00:00Z',
            discount: null,
            linkCount: 2,
        }),
        current: countsFixture(),
        previous: countsFixture(),
        daily: dailyFixture(false, 0),
    },
    {
        campaign: campaignFixture({
            id: 'tiktok-test',
            name: 'TikTok test',
            linkName: 'tiktok-test',
            startsAt: null,
            endsAt: null,
            discount: null,
            linkCount: 1,
        }),
        current: countsFixture({ visits: 150, visitors: 132 }),
        previous: countsFixture({ visits: 20, visitors: 18 }),
        daily: dailyFixture(true, 1),
    },
    {
        campaign: campaignFixture({
            id: 'spring',
            name: 'Spring 20%',
            linkName: 'spring20',
            status: 'ENDED',
            startsAt: '2026-04-01T07:00:00Z',
            endsAt: '2026-04-30T20:59:00Z',
            discount: {
                id: 'discount-0',
                percent: 20,
                label: null,
                startsAt: '2026-04-01T07:00:00Z',
                endsAt: '2026-04-30T20:59:00Z',
                status: 'ENDED',
            },
        }),
        current: countsFixture({ visits: 30, visitors: 26, signedUp: 1 }),
        previous: countsFixture({ visits: 400, visitors: 380, signedUp: 20, sales: 6, salesRevenueMinorByCurrency: { EUR: 23500 } }),
        daily: dailyFixture(false, 1),
    },
    {
        campaign: campaignFixture({
            id: 'old-bio',
            name: 'October bio link',
            linkName: 'october-bio',
            status: 'ARCHIVED',
            startsAt: null,
            endsAt: null,
            archivedAt: '2026-05-02T10:00:00Z',
            discount: null,
            linkCount: 1,
        }),
        current: countsFixture({ visits: 12, visitors: 11 }),
        previous: countsFixture({ visits: 15, visitors: 14 }),
        daily: dailyFixture(false, 0),
    },
];

export const campaignListFixture: CampaignListDto = {
    previousSince: '2026-04-16T21:00:00Z',
    previousUntil: '2026-05-16T21:00:00Z',
    current: countsFixture({ visits: 2262, visitors: 1949, signedUp: 77, sales: 24, salesRevenueMinorByCurrency: { EUR: 119600 } }),
    previous: countsFixture({ visits: 2145, visitors: 1922, signedUp: 75, sales: 18, salesRevenueMinorByCurrency: { EUR: 82300 } }),
    items: ITEMS,
};

// What the marketing role gets: the same, with no revenue anywhere.
export const campaignListForMarketingFixture: CampaignListDto = {
    ...campaignListFixture,
    current: { ...campaignListFixture.current, salesRevenueMinorByCurrency: null },
    previous: campaignListFixture.previous && { ...campaignListFixture.previous, salesRevenueMinorByCurrency: null },
    items: ITEMS.map((item) => ({
        ...item,
        current: { ...item.current, salesRevenueMinorByCurrency: null },
        previous: item.previous && { ...item.previous, salesRevenueMinorByCurrency: null },
    })),
};

export const emptyCampaignListFixture: CampaignListDto = { ...campaignListFixture, current: countsFixture(), previous: countsFixture(), items: [] };
