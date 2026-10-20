import type { VisitorMetricsDto } from '@/lib/api/types';

export function visitorMetricsFixture(): VisitorMetricsDto {
    return {
        configured: true,
        since: '2026-09-01',
        until: '2026-10-17',
        updatedAt: '2026-10-17T09:30:00Z',
        visitors: 1800,
        visits: 2400,
        signups: 36,
        daily: [
            { date: '2026-10-15', visitors: 40, visits: 52 },
            { date: '2026-10-16', visitors: 55, visits: 70 },
        ],
        channels: [
            { channel: 'SEARCH', visits: 1200, signups: 12 },
            { channel: 'SOCIAL', visits: 30, signups: 2 },
            { channel: 'INVITE', visits: 0, signups: 22 },
        ],
        pages: [
            { page: '/', visits: 1500 },
            { page: '/el/gamos', visits: 600 },
            { page: null, visits: 300 },
        ],
        languages: [
            { language: 'el', visits: 900 },
            { language: 'en', visits: 1500 },
        ],
        devices: [
            { device: 'PHONE', visits: 1800 },
            { device: 'DESKTOP', visits: 500 },
            { device: 'TABLET', visits: 100 },
        ],
        landing: {
            sections: [
                { section: 'how_it_works', visitors: 1440 },
                { section: 'pricing', visitors: 540 },
            ],
            clicks: [{ event: 'create', placement: 'hero', count: 120 }],
            plans: [{ plan: 'PRO', count: 45 }],
            faq: [{ question: 2, count: 17 }],
        },
    };
}

export function emptyVisitorMetricsFixture(): VisitorMetricsDto {
    return {
        ...visitorMetricsFixture(),
        visitors: 0,
        visits: 0,
        signups: 0,
        daily: [],
        channels: [],
        pages: [],
        languages: [
            { language: 'el', visits: 0 },
            { language: 'en', visits: 0 },
        ],
        devices: [
            { device: 'PHONE', visits: 0 },
            { device: 'DESKTOP', visits: 0 },
            { device: 'TABLET', visits: 0 },
        ],
        landing: { sections: [], clicks: [], plans: [], faq: [] },
    };
}

export function notConfiguredVisitorMetricsFixture(): VisitorMetricsDto {
    return { ...emptyVisitorMetricsFixture(), configured: false, since: null, until: null, updatedAt: null, languages: [], devices: [] };
}
