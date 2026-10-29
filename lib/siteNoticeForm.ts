import { instantToLocalInput } from '@/lib/adminPlanForm';
import type { AdminSiteNoticeDto, AdminSiteNoticeRequestDto, SiteNoticeArea, SiteNoticeTone } from '@/lib/api/types';
import { datetimeLocalValueToIso, parseDatetimeLocalValue } from '@/lib/datetime';

// The admin drawer's form for one site notice. Times are edited in the admin's own clock
// ("YYYY-MM-DDTHH:mm") and sent as instants. Limits mirror SiteNoticeService.

export const SITE_NOTICE_MESSAGE_MAX = 200;
export const SITE_NOTICE_LINK_LABEL_MAX = 40;
export const SITE_NOTICE_TONES: SiteNoticeTone[] = ['INFO', 'OFFER', 'WARNING', 'CRITICAL'];
export type ChoosableArea = Exclude<SiteNoticeArea, 'EVERYWHERE'>;
export const CHOOSABLE_AREAS: ChoosableArea[] = ['PUBLIC', 'HOST', 'GUEST', 'ADMIN'];

export type SiteNoticeForm = {
    tone: SiteNoticeTone;
    messageEn: string;
    messageEl: string;
    linkUrl: string;
    linkLabelEn: string;
    linkLabelEl: string;
    where: 'everywhere' | 'choose';
    areas: ChoosableArea[];
    dismissible: boolean;
    startsAt: string;
    endsAt: string;
    active: boolean;
};

export type SiteNoticeFormProblem = 'message' | 'linkLabel' | 'areas' | 'schedule';

export const EMPTY_SITE_NOTICE_FORM: SiteNoticeForm = {
    tone: 'INFO',
    messageEn: '',
    messageEl: '',
    linkUrl: '',
    linkLabelEn: '',
    linkLabelEl: '',
    where: 'everywhere',
    areas: [],
    dismissible: true,
    startsAt: '',
    endsAt: '',
    active: true,
};

export function formOfNotice(notice: AdminSiteNoticeDto): SiteNoticeForm {
    const everywhere = notice.areas.includes('EVERYWHERE');
    return {
        tone: notice.tone,
        messageEn: notice.message.en ?? '',
        messageEl: notice.message.el ?? '',
        linkUrl: notice.linkUrl ?? '',
        linkLabelEn: notice.linkLabel.en ?? '',
        linkLabelEl: notice.linkLabel.el ?? '',
        where: everywhere ? 'everywhere' : 'choose',
        areas: everywhere ? [] : (notice.areas as ChoosableArea[]),
        dismissible: notice.dismissible,
        startsAt: instantToLocalInput(notice.startsAt),
        endsAt: instantToLocalInput(notice.endsAt),
        active: notice.active,
    };
}

export function siteNoticeFormProblem(form: SiteNoticeForm): SiteNoticeFormProblem | null {
    if (!form.messageEn.trim() || !form.messageEl.trim()) return 'message';
    if (form.linkUrl.trim() && (!form.linkLabelEn.trim() || !form.linkLabelEl.trim())) return 'linkLabel';
    if (form.where === 'choose' && form.areas.length === 0) return 'areas';
    const start = parseDatetimeLocalValue(form.startsAt);
    const end = parseDatetimeLocalValue(form.endsAt);
    if (start && end && end.getTime() <= start.getTime()) return 'schedule';
    return null;
}

export function requestOfForm(form: SiteNoticeForm): AdminSiteNoticeRequestDto {
    const linkUrl = form.linkUrl.trim() || null;
    return {
        tone: form.tone,
        message: { en: form.messageEn.trim(), el: form.messageEl.trim() },
        linkUrl,
        linkLabel: linkUrl ? { en: form.linkLabelEn.trim(), el: form.linkLabelEl.trim() } : null,
        areas: form.where === 'everywhere' ? ['EVERYWHERE'] : form.areas,
        dismissible: form.dismissible,
        startsAt: datetimeLocalValueToIso(form.startsAt),
        endsAt: datetimeLocalValueToIso(form.endsAt),
        active: form.active,
    };
}
