import { describe, expect, it } from 'vitest';

import type { AdminSiteNoticeDto } from '@/lib/api/types';
import { EMPTY_SITE_NOTICE_FORM, formOfNotice, requestOfForm, siteNoticeFormProblem } from '@/lib/siteNoticeForm';

const filled = { ...EMPTY_SITE_NOTICE_FORM, messageEn: ' Outage ', messageEl: 'Διακοπή' };

describe('siteNoticeForm', () => {
    it('starts as an on, closable Info notice shown everywhere', () => {
        expect(EMPTY_SITE_NOTICE_FORM).toMatchObject({ tone: 'INFO', where: 'everywhere', dismissible: true, active: true });
    });

    it('names the first problem, or none', () => {
        expect(siteNoticeFormProblem(EMPTY_SITE_NOTICE_FORM)).toBe('message');
        expect(siteNoticeFormProblem({ ...filled, linkUrl: '/pricing', linkLabelEn: 'See plans' })).toBe('linkLabel');
        expect(siteNoticeFormProblem({ ...filled, where: 'choose', areas: [] })).toBe('areas');
        expect(siteNoticeFormProblem({ ...filled, startsAt: '2026-11-02T10:00', endsAt: '2026-11-01T10:00' })).toBe('schedule');
        expect(siteNoticeFormProblem(filled)).toBeNull();
    });

    it('builds a trimmed request, with EVERYWHERE or the chosen areas and no link fields without a link', () => {
        expect(requestOfForm(filled)).toEqual({
            tone: 'INFO',
            message: { en: 'Outage', el: 'Διακοπή' },
            linkUrl: null,
            linkLabel: null,
            areas: ['EVERYWHERE'],
            dismissible: true,
            startsAt: null,
            endsAt: null,
            active: true,
        });
        const offer = requestOfForm({ ...filled, where: 'choose', areas: ['PUBLIC', 'HOST'], linkUrl: '/pricing', linkLabelEn: 'See plans', linkLabelEl: 'Πακέτα' });
        expect(offer.areas).toEqual(['PUBLIC', 'HOST']);
        expect(offer.linkLabel).toEqual({ en: 'See plans', el: 'Πακέτα' });
    });

    it('round-trips a saved notice', () => {
        const saved: AdminSiteNoticeDto = {
            id: 'n1',
            version: 2,
            tone: 'OFFER',
            message: { en: '20% off', el: '20% έκπτωση' },
            linkUrl: '/pricing',
            linkLabel: { en: 'See plans', el: 'Πακέτα' },
            areas: ['PUBLIC', 'HOST'],
            dismissible: true,
            startsAt: null,
            endsAt: null,
            active: false,
            status: 'OFF',
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-01T00:00:00Z',
        };
        const form = formOfNotice(saved);
        expect(form).toMatchObject({ where: 'choose', areas: ['PUBLIC', 'HOST'], linkLabelEl: 'Πακέτα', active: false });
        expect(requestOfForm(form)).toMatchObject({ areas: ['PUBLIC', 'HOST'], linkUrl: '/pricing', active: false });
    });
});
