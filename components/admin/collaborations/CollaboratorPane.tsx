'use client';

import { useTranslations } from 'next-intl';

import { CollaborationCodeDrawer } from '@/components/admin/CollaborationCodeDrawer';
import { CollaboratorBusinessDetails } from '@/components/admin/collaborations/CollaboratorBusinessDetails';
import { CollaboratorBusinessDrawer } from '@/components/admin/collaborations/CollaboratorBusinessDrawer';
import { CollaboratorCodesTable } from '@/components/admin/collaborations/CollaboratorCodesTable';
import { CollaboratorCommissionTiers } from '@/components/admin/collaborations/CollaboratorCommissionTiers';
import { CollaboratorLedger } from '@/components/admin/collaborations/CollaboratorLedger';
import { CollaboratorOwedTotals } from '@/components/admin/collaborations/CollaboratorOwedTotals';
import { CollaboratorPaneHeader } from '@/components/admin/collaborations/CollaboratorPaneHeader';
import { CollaboratorPortalLink } from '@/components/admin/collaborations/CollaboratorPortalLink';
import { CollaboratorStatusConfirm } from '@/components/admin/collaborations/CollaboratorStatusConfirm';
import { CommissionTiersDrawer } from '@/components/admin/collaborations/CommissionTiersDrawer';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { LinkPartnerDiscountCodeDrawer } from '@/components/admin/LinkPartnerDiscountCodeDrawer';
import { useCollaboratorPane } from '@/hooks/useCollaboratorPane';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorPane({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations');
    const pane = useCollaboratorPane(collaborator);

    return (
        <div className="min-w-0 flex-1 space-y-8">
            {/* Header */}
            <CollaboratorPaneHeader collaborator={collaborator} onEditAction={pane.openEdit} onStatusAction={pane.openStatusConfirm} />

            {/* Portal link */}
            <CollaboratorPortalLink collaborator={collaborator} />

            {/* Business details */}
            <CollaboratorBusinessDetails collaborator={collaborator} onEditAction={pane.openBusiness} />

            {/* Codes */}
            <CollaboratorCodesTable
                codes={pane.codes}
                isLoading={pane.codesLoading}
                error={pane.codesError}
                onCreateAction={pane.openCreateCode}
                onLinkAction={pane.openLink}
                onEditAction={pane.handleEditCodeClick}
            />

            {/* Commission tiers */}
            <CollaboratorCommissionTiers collaborator={collaborator} onEditAction={pane.openTiers} />

            {/* Earnings */}
            <section className="space-y-3">
                <h3 className="text-base font-semibold text-ink">{t('earnings.title')}</h3>
                <CollaboratorOwedTotals totals={collaborator.earningsTotals} />
                <CollaboratorLedger collaboratorId={collaborator.id} codes={pane.codes} missingPayoutFields={collaborator.missingPayoutFields} />
            </section>

            <CollaboratorDrawer open={pane.editOpen} collaborator={collaborator} onCloseAction={pane.closeEdit} />
            <CollaboratorBusinessDrawer
                key={`business-${pane.drawerKey}`}
                open={pane.businessOpen}
                collaborator={collaborator}
                onCloseAction={pane.closeBusiness}
            />
            <CommissionTiersDrawer
                key={`tiers-${pane.drawerKey}`}
                open={pane.tiersOpen}
                collaborator={collaborator}
                onCloseAction={pane.closeTiers}
            />
            <CollaborationCodeDrawer
                key={pane.editingCode?.id ?? 'new-code'}
                open={pane.codeDrawerOpen}
                collaborator={collaborator}
                code={pane.editingCode}
                onCloseAction={pane.closeCodeDrawer}
            />
            <LinkPartnerDiscountCodeDrawer open={pane.linkOpen} collaborator={collaborator} onCloseAction={pane.closeLink} />
            <CollaboratorStatusConfirm
                open={pane.statusConfirmOpen}
                collaborator={collaborator}
                nextStatus={pane.nextStatus}
                isConfirming={pane.statusSaving}
                error={pane.statusError}
                onCloseAction={pane.closeStatusConfirm}
                onConfirmAction={pane.confirmStatusChange}
            />
        </div>
    );
}
