import type { CampaignLinkDto, CampaignOverviewDto, CampaignRowDto } from '@/lib/api/types';

export const campaignOverviewFixture: CampaignOverviewDto = {
    visits: 1240,
    visitors: 1000,
    createClicks: 150,
    plansClicks: 60,
    planPicks: 20,
    signedUp: 40,
    paidHost: 10,
    revenueMinorByCurrency: { EUR: 131000 },
    daily: [
        { date: '2027-03-01', visits: 40, visitors: 33 },
        { date: '2027-03-02', visits: 0, visitors: 0 },
    ],
    hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, visits: hour === 9 ? 40 : 0, visitors: hour === 9 ? 33 : 0 })),
    devices: [
        { device: 'PHONE', visits: 900 },
        { device: 'DESKTOP', visits: 340 },
    ],
    languages: [
        { language: 'el', visits: 1100 },
        { language: 'en', visits: 140 },
    ],
    pages: [
        { page: '/el', visits: 1000 },
        { page: '/for-business', visits: 200 },
        { page: null, visits: 40 },
    ],
};

// The same numbers for a range that is one day.
export const oneDayCampaignOverviewFixture: CampaignOverviewDto = {
    ...campaignOverviewFixture,
    daily: [{ date: '2027-03-01', visits: 40, visitors: 33 }],
};

export const emptyCampaignOverviewFixture: CampaignOverviewDto = {
    visits: 0,
    visitors: 0,
    createClicks: 0,
    plansClicks: 0,
    planPicks: 0,
    signedUp: 3,
    paidHost: 0,
    revenueMinorByCurrency: {},
    daily: [],
    hourly: [],
    devices: [],
    languages: [],
    pages: [],
};

function link(id: string, name: string, utmSource: string, utmMedium: string, utmCampaign: string): CampaignLinkDto {
    return { id, name, destinationPath: '/el', utmSource, utmMedium, utmCampaign, createdAt: '2027-02-01T10:00:00Z' };
}

function row(utmSource: string | null, utmMedium: string | null, utmCampaign: string | null, counts: Partial<CampaignRowDto>): CampaignRowDto {
    return {
        utmSource,
        utmMedium,
        utmCampaign,
        link: null,
        visits: 0,
        visitors: 0,
        createClicks: 0,
        plansClicks: 0,
        planPicks: 0,
        signedUp: 0,
        createdEvent: 0,
        paidHost: 0,
        revenueMinorByCurrency: {},
        ...counts,
    };
}

// The report rows behind the By source table: two Instagram links, one Facebook link, a saved link
// with nothing yet, and an unsaved campaign with only sign-ups (left out, like on Spring).
export const campaignReportFixture: CampaignRowDto[] = [
    row('instagram', 'social', 'spring', {
        link: link('l1', 'Spring bio', 'instagram', 'social', 'spring'),
        visits: 800,
        visitors: 640,
        createClicks: 100,
        signedUp: 30,
        paidHost: 8,
        revenueMinorByCurrency: { EUR: 100000 },
    }),
    row('facebook', 'social', 'spring', { link: link('l2', 'Spring post', 'facebook', 'social', 'spring'), visits: 300, visitors: 250, signedUp: 6 }),
    row('instagram', 'story', 'spring', {
        link: link('l3', 'Spring story', 'instagram', 'story', 'spring'),
        visits: 140,
        visitors: 110,
        signedUp: 4,
        paidHost: 2,
        revenueMinorByCurrency: { EUR: 31000 },
    }),
    row('tiktok', 'social', 'launch', { link: link('l4', 'Launch', 'tiktok', 'social', 'launch') }),
    row('newsletter', 'email', 'march', { signedUp: 5 }),
];
