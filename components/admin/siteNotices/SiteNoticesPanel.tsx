'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SiteNoticeDrawer } from '@/components/admin/siteNotices/SiteNoticeDrawer';
import { SiteNoticesTable } from '@/components/admin/siteNotices/SiteNoticesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useSiteNoticesPanel } from '@/hooks/useSiteNoticesPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// The notice bar's admin (spec 2026-10-22-site-notices-design §5).
export function SiteNoticesPanel() {
    const t = useTranslations('AdminPage');
    const { query, notices, drawer, handleCreateClick, handleEditClick, closeDrawer } = useSiteNoticesPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleCreateClick}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('siteNotices.create')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && notices.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('siteNotices.empty')}</p>}
                {notices.length > 0 && <SiteNoticesTable notices={notices} onEditAction={handleEditClick} />}
            </section>

            {/* Drawer */}
            <SiteNoticeDrawer key={drawer.token} open={drawer.open} notice={drawer.notice} onCloseAction={closeDrawer} />
        </section>
    );
}
