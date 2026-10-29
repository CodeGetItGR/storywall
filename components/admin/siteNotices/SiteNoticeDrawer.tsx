'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { SiteNoticeAreasControl } from '@/components/admin/siteNotices/SiteNoticeAreasControl';
import { SiteNoticeToneControl } from '@/components/admin/siteNotices/SiteNoticeToneControl';
import { SiteNoticeBanner } from '@/components/siteNotices/SiteNoticeBanner';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { type PreviewLocale, useSiteNoticeForm } from '@/hooks/useSiteNoticeForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminSiteNoticeDto } from '@/lib/api/types';
import { SITE_NOTICE_LINK_LABEL_MAX, SITE_NOTICE_MESSAGE_MAX } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

const FORM_ID = 'site-notice-form';
const PREVIEW_LOCALES: PreviewLocale[] = ['en', 'el'];
const LINK_URL_MAX = 500;
// Shown in the preview while a field is still empty.
const PLACEHOLDER = '…';

function noop() {}

// Create or edit one site notice. The panel remounts it (key) on every opening.
export function SiteNoticeDrawer({ open, notice, onCloseAction }: { open: boolean; notice: AdminSiteNoticeDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = useSiteNoticeForm(notice, onCloseAction);
    const { form } = f;

    function handlePreviewLocaleClick(event: MouseEvent<HTMLButtonElement>) {
        f.setPreviewLocale(event.currentTarget.dataset.locale as PreviewLocale);
    }

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('cancel')}
                closeDisabled={f.busy}
                title={notice ? t('siteNotices.editTitle') : t('siteNotices.createTitle')}
                footer={
                    <>
                        {/* Danger */}
                        <div>
                            {notice && (
                                <button
                                    type="button"
                                    onClick={f.openDeleteConfirmation}
                                    disabled={f.busy}
                                    className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {t('siteNotices.delete')}
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={f.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={f.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {f.busy && !f.deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Preview */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('siteNotices.fields.preview')}</p>
                            <div className="flex gap-1 rounded-md bg-canvas p-0.5">
                                {PREVIEW_LOCALES.map((locale) => (
                                    <button
                                        key={locale}
                                        type="button"
                                        data-locale={locale}
                                        onClick={handlePreviewLocaleClick}
                                        aria-pressed={f.previewLocale === locale}
                                        className={cn(
                                            'rounded px-2 py-0.5 font-mono text-[11px] font-bold',
                                            f.previewLocale === locale ? 'bg-card text-ink shadow-sm' : 'text-ink-faint',
                                        )}
                                    >
                                        {locale.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* inert: a picture of the bar, not a live region or a working link. */}
                        <div inert className="overflow-hidden rounded-lg border border-border">
                            <SiteNoticeBanner
                                tone={form.tone}
                                message={f.previewMessage || PLACEHOLDER}
                                link={f.hasLink ? { href: '#', label: f.previewLinkLabel || PLACEHOLDER } : null}
                                onDismiss={form.dismissible ? noop : null}
                            />
                        </div>
                    </div>

                    {/* Tone */}
                    <SiteNoticeToneControl value={form.tone} onChangeAction={f.setTone} />

                    {/* Message */}
                    <AdminField label={t('siteNotices.fields.messageEn')} required hint={`${form.messageEn.length}/${SITE_NOTICE_MESSAGE_MAX}`}>
                        <textarea
                            name="messageEn"
                            aria-label={t('siteNotices.fields.messageEn')}
                            rows={2}
                            className={adminInputClass('resize-y')}
                            maxLength={SITE_NOTICE_MESSAGE_MAX}
                            value={form.messageEn}
                            onChange={f.handleTextChange}
                        />
                    </AdminField>
                    <AdminField label={t('siteNotices.fields.messageEl')} required hint={`${form.messageEl.length}/${SITE_NOTICE_MESSAGE_MAX}`}>
                        <textarea
                            name="messageEl"
                            aria-label={t('siteNotices.fields.messageEl')}
                            rows={2}
                            className={adminInputClass('resize-y')}
                            maxLength={SITE_NOTICE_MESSAGE_MAX}
                            value={form.messageEl}
                            onChange={f.handleTextChange}
                        />
                    </AdminField>

                    {/* Link */}
                    <AdminField label={t('siteNotices.fields.linkUrl')} optional hint={t('siteNotices.fields.linkUrlHint')}>
                        <input
                            name="linkUrl"
                            aria-label={t('siteNotices.fields.linkUrl')}
                            className={adminInputClass('font-mono')}
                            maxLength={LINK_URL_MAX}
                            value={form.linkUrl}
                            onChange={f.handleTextChange}
                        />
                    </AdminField>
                    {f.hasLink && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <AdminField label={t('siteNotices.fields.linkLabelEn')} required>
                                <input
                                    name="linkLabelEn"
                                    aria-label={t('siteNotices.fields.linkLabelEn')}
                                    className={adminInputClass()}
                                    maxLength={SITE_NOTICE_LINK_LABEL_MAX}
                                    value={form.linkLabelEn}
                                    onChange={f.handleTextChange}
                                />
                            </AdminField>
                            <AdminField label={t('siteNotices.fields.linkLabelEl')} required>
                                <input
                                    name="linkLabelEl"
                                    aria-label={t('siteNotices.fields.linkLabelEl')}
                                    className={adminInputClass()}
                                    maxLength={SITE_NOTICE_LINK_LABEL_MAX}
                                    value={form.linkLabelEl}
                                    onChange={f.handleTextChange}
                                />
                            </AdminField>
                        </div>
                    )}

                    {/* Where */}
                    <SiteNoticeAreasControl where={form.where} areas={form.areas} onWhereChangeAction={f.setWhere} onToggleAreaAction={f.toggleArea} />

                    {/* Schedule */}
                    <div className="grid gap-4">
                        <AdminField label={t('siteNotices.fields.startsAt')} optional hint={form.startsAt ? undefined : t('siteNotices.scheduleNow')}>
                            <DateTimeField value={form.startsAt} onChange={f.setStartsAt} inputClassName={adminInputClass()} />
                        </AdminField>
                        <AdminField label={t('siteNotices.fields.endsAt')} optional hint={form.endsAt ? undefined : t('siteNotices.scheduleNoEnd')}>
                            <DateTimeField value={form.endsAt} onChange={f.setEndsAt} inputClassName={adminInputClass()} />
                        </AdminField>
                    </div>

                    {/* Switches */}
                    <div className="rounded-lg border border-border">
                        <AdminSwitch label={t('siteNotices.fields.dismissible')} checked={form.dismissible} onCheckedChangeAction={f.setDismissible} />
                        <AdminSwitch label={t('siteNotices.fields.active')} checked={form.active} onCheckedChangeAction={f.setActive} />
                    </div>

                    {/* Errors */}
                    {f.problem && <p className="text-sm text-status-danger">{t(`siteNotices.problems.${f.problem}`)}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
                </form>
            </AdminDrawer>

            <ConfirmActionModal
                open={f.confirmDelete}
                title={t('siteNotices.deleteTitle')}
                body={t('siteNotices.deleteBody')}
                confirmLabel={t('siteNotices.deleteConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={f.deleting}
                onCloseAction={f.closeDeleteConfirmation}
                onConfirmAction={f.confirmDeletion}
                icon={f.deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
