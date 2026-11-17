import type { AdminEventActivityDto, AdminEventActivityHour } from '@/lib/api/types';

const hour = (value: string, posts: number, stories: number, gallery: number, wishes: number): AdminEventActivityHour => ({
    hour: value,
    posts,
    stories,
    gallery,
    wishes,
});

// A Saturday wedding in Athens: a quiet build-up, a peak around midnight, a trickle of uploads after.
export const weddingActivityFixture: AdminEventActivityDto = {
    timezone: 'Europe/Athens',
    eventStartAt: '2026-06-13T13:00:00Z',
    eventEndAt: '2026-06-14T01:00:00Z',
    generatedAt: '2026-06-16T11:02:00Z',
    members: { total: 184, contributed: 121 },
    totals: {
        posts: 268,
        postMedia: 601,
        stories: 128,
        storyViews: 2410,
        galleryUploads: 380,
        galleryViaQr: 176,
        proUploads: 0,
        comments: 688,
        reactions: 3905,
        reactionsByType: [
            { code: 'heart', emoji: '❤️', count: 2100 },
            { code: 'laugh', emoji: '😂', count: 1105 },
            { code: 'wow', emoji: '😮', count: 700 },
        ],
        wishes: 101,
        playlist: { suggestions: 58, votes: 410 },
        quizAnswers: null,
        rsvp: { attending: 120, declined: 6 },
    },
    removed: { posts: 8, stories: 3, galleryUploads: 0, comments: 0, wishes: 0 },
    hours: [
        hour('2026-06-12T20:00', 2, 0, 1, 0),
        hour('2026-06-13T16:00', 4, 1, 2, 0),
        hour('2026-06-13T17:00', 6, 2, 3, 1),
        hour('2026-06-13T18:00', 9, 4, 10, 2),
        hour('2026-06-13T19:00', 14, 6, 18, 3),
        hour('2026-06-13T20:00', 22, 10, 30, 6),
        hour('2026-06-13T21:00', 30, 14, 40, 8),
        hour('2026-06-13T22:00', 41, 20, 52, 10),
        hour('2026-06-13T23:00', 60, 30, 90, 34),
        hour('2026-06-14T00:00', 52, 28, 80, 28),
        hour('2026-06-14T01:00', 20, 10, 30, 6),
        hour('2026-06-14T02:00', 8, 3, 10, 1),
        hour('2026-06-15T10:00', 0, 0, 14, 2),
    ],
};

export const emptyActivityFixture: AdminEventActivityDto = {
    ...weddingActivityFixture,
    members: { total: 3, contributed: 0 },
    totals: {
        ...weddingActivityFixture.totals,
        posts: 0,
        postMedia: 0,
        stories: 0,
        storyViews: 0,
        galleryUploads: 0,
        galleryViaQr: 0,
        comments: 0,
        reactions: 0,
        reactionsByType: [],
        wishes: null,
        playlist: null,
        rsvp: null,
    },
    removed: { posts: 0, stories: 0, galleryUploads: 0, comments: 0, wishes: 0 },
    hours: [],
};

// A three-day festival with professional uploads and a quiz.
export const festivalActivityFixture: AdminEventActivityDto = {
    ...weddingActivityFixture,
    eventStartAt: '2026-07-10T15:00:00Z',
    eventEndAt: '2026-07-12T21:00:00Z',
    generatedAt: '2026-07-13T09:00:00Z',
    totals: {
        ...weddingActivityFixture.totals,
        posts: 127,
        postMedia: 240,
        stories: 49,
        storyViews: 1130,
        galleryUploads: 166,
        galleryViaQr: 70,
        proUploads: 48,
        quizAnswers: 230,
        wishes: null,
    },
    hours: [
        hour('2026-07-10T18:00', 10, 4, 12, 0),
        hour('2026-07-10T22:00', 30, 12, 40, 0),
        hour('2026-07-11T19:00', 18, 6, 20, 0),
        hour('2026-07-11T23:00', 44, 18, 61, 0),
        hour('2026-07-12T21:00', 25, 9, 33, 0),
    ],
};
