'use client';

import { useTranslations } from 'next-intl';

import { CollaboratorPane } from '@/components/admin/collaborations/CollaboratorPane';
import { CollaboratorsPaneEmpty } from '@/components/admin/collaborations/CollaboratorsPaneEmpty';
import { CollaboratorsRail } from '@/components/admin/collaborations/CollaboratorsRail';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCollaborationsSection } from '@/hooks/useCollaborationsSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function CollaborationsSection() {
    const t = useTranslations('AdminPage');
    const section = useCollaborationsSection();
    const ready = !section.isLoading && !section.error;

    return (
        <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('collaborations.title')}</h1>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                {/* Rail */}
                <CollaboratorsRail
                    collaborators={section.railCollaborators}
                    selectedId={section.selectedCollaborator?.id ?? null}
                    search={section.search}
                    onSearchChangeAction={section.handleSearchChange}
                    onSelectAction={section.handleRailClick}
                    onCreateAction={section.openCreate}
                />

                {/* Pane */}
                {section.isLoading && <LoadingState label={t('collaborations.loading')} className="justify-start py-6" />}
                {Boolean(section.error) && <p className="py-6 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(section.error)}`)}</p>}
                {ready && !section.selectedCollaborator && <CollaboratorsPaneEmpty onCreateAction={section.openCreate} />}
                {ready && section.selectedCollaborator && (
                    <CollaboratorPane key={section.selectedCollaborator.id} collaborator={section.selectedCollaborator} />
                )}
            </div>

            <CollaboratorDrawer
                open={section.createOpen}
                collaborator={null}
                onCloseAction={section.closeCreate}
                onSavedAction={section.handleCreated}
            />
        </div>
    );
}
