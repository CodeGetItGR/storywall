'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhoneCreateDrawer } from '@/components/admin/phones/PhoneCreateDrawer';
import { PhoneDetailDrawer } from '@/components/admin/phones/PhoneDetailDrawer';
import { PhonesTable } from '@/components/admin/phones/PhonesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { usePhonesPanel } from '@/hooks/usePhonesPanel';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// The admin's paired phones (spec 2026-10-28-admin-phone-widget-design).
export function PhonesPanel() {
    const t = useTranslations('AdminPage');
    const { query, devices, create, detail, handleAddClick, closeCreate, handleCreateClosed, handleOpenClick, closeDetail } = usePhonesPanel();

    return (
        <section className="space-y-4">
            {/* Header */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleAddClick}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('phones.add')}
                </button>
            </div>

            {/* List */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-4 py-6" />}
                {query.error && <p className="px-4 py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(query.error)}`)}</p>}
                {!query.isLoading && !query.error && devices.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('phones.empty')}</p>}
                {devices.length > 0 && <PhonesTable devices={devices} onOpenAction={handleOpenClick} />}
            </section>

            {/* Drawers */}
            <PhoneCreateDrawer key={`create-${create.token}`} open={create.open} onCloseAction={closeCreate} onClosedAction={handleCreateClosed} />
            <PhoneDetailDrawer key={`detail-${detail.token}`} open={detail.open} device={detail.device} onCloseAction={closeDetail} />
        </section>
    );
}
