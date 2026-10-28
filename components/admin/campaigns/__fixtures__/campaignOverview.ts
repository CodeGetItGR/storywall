import type { CampaignOverviewDto } from '@/lib/api/types';

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
    devices: [
        { device: 'PHONE', visits: 900 },
        { device: 'DESKTOP', visits: 340 },
    ],
    languages: [
        { language: 'el', visits: 1100 },
        { language: 'en', visits: 140 },
    ],
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
    devices: [],
    languages: [],
};
