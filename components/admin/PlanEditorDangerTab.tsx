'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AdminTabPanel } from '@/components/admin/AdminTabs';

function DangerRow({ title, body, children }: { title: string; body: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border-t border-status-danger-wash py-4 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:max-w-lg">
                <p className="text-sm font-bold text-status-danger">{title}</p>
                <p className="mt-1 text-xs leading-5 text-status-danger/70">{body}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

export function PlanEditorDangerTab({
    editorId,
    activeTab,
    isDeleting,
    onDeleteOpen,
}: {
    editorId: string;
    activeTab: string;
    isDeleting: boolean;
    onDeleteOpen: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <AdminTabPanel id={editorId} tabKey="danger" active={activeTab} className="pt-5">
            {/* Danger */}
            <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.destructiveHint')}</p>
            <div className="rounded-lg border border-status-danger-wash bg-status-danger-wash/40 px-4 py-1">
                <DangerRow title={t('plans.delete')} body={t('plans.deleteConfirmBody')}>
                    <button
                        type="button"
                        onClick={onDeleteOpen}
                        disabled={isDeleting}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-status-danger px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('plans.delete')}
                    </button>
                </DangerRow>
            </div>
        </AdminTabPanel>
    );
}
