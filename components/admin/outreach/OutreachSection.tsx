'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OutreachAddModal } from '@/components/admin/outreach/OutreachAddModal';
import { OutreachDrawer } from '@/components/admin/outreach/OutreachDrawer';
import { OutreachGuide } from '@/components/admin/outreach/OutreachGuide';
import { OutreachOverview } from '@/components/admin/outreach/OutreachOverview';
import { OutreachProspects } from '@/components/admin/outreach/OutreachProspects';
import { OutreachStatusHelp } from '@/components/admin/outreach/OutreachStatusHelp';
import { useOutreachSection } from '@/hooks/useOutreachSection';

// Partner outreach: businesses we may approach, how far each one got, and what to do next.
export function OutreachSection() {
    const t = useTranslations('AdminPage.outreach');
    const s = useOutreachSection();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                <div className="flex items-center gap-2">
                    <OutreachStatusHelp />
                    <button
                        type="button"
                        onClick={s.handleAddClick}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                    >
                        <Plus aria-hidden="true" className="h-4 w-4" />
                        {t('add.action')}
                    </button>
                </div>
            </header>

            <div className="space-y-6">
                {/* How this works */}
                {s.guide.visible && <OutreachGuide onDismissAction={s.guide.dismiss} />}

                {/* Overview */}
                <OutreachOverview summary={s.summary} isLoading={s.summaryLoading} error={s.summaryError} onOpenAction={s.handleOpenClick} />

                {/* Businesses */}
                <OutreachProspects table={s.table} cities={s.cities} onOpenAction={s.handleOpenClick} />
            </div>

            {/* Drawer */}
            <OutreachDrawer
                prospectId={s.selection.shownId}
                open={s.selection.selectedId !== null}
                onCloseAction={s.selection.closeProspect}
                onClosedAction={s.selection.handleClosed}
            />

            {/* Add */}
            <OutreachAddModal
                key={s.add.token}
                open={s.add.open}
                onCloseAction={s.closeAdd}
                onCreatedAction={s.openAfterAdd}
                onOpenExistingAction={s.openAfterAdd}
            />
        </div>
    );
}
