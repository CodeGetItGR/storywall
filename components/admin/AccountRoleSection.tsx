'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AccountRoleControl } from '@/components/admin/AccountRoleControl';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAccountRoleChange } from '@/hooks/useAccountRoleChange';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isTeamRole } from '@/lib/accountRole';
import type { UserResponseDto } from '@/lib/api/types';

// Only an admin switches an account between User and Marketing. ADMIN and GUEST show read-only.
export function AccountRoleSection({ account, onChangedAction }: { account: UserResponseDto; onChangedAction: (account: UserResponseDto) => void }) {
    const t = useTranslations('AdminPage.accounts');
    const { role: viewerRole } = useAdminNavigation();
    const roleChange = useAccountRoleChange({ account, onChangedAction });
    const toErrorMessage = useApiErrorMessage();
    const toMarketing = roleChange.requestedRole === 'MARKETING';

    if (viewerRole !== 'ADMIN') return null;

    return (
        <section aria-labelledby="account-role-heading" className="border-t border-border pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 id="account-role-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('roleAccess.title')}
                </h3>
                {roleChange.isPending ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" /> : null}
            </div>

            {isTeamRole(account.platformRole) ? (
                <AccountRoleControl role={account.platformRole} disabled={roleChange.isPending} onChangeAction={roleChange.handleRoleRequest} />
            ) : (
                <div>
                    <p className="text-sm font-semibold text-ink">{t(`role.${account.platformRole}`)}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-faint">{t('roleAccess.readOnlyHint')}</p>
                </div>
            )}
            {roleChange.saved ? (
                <p role="status" className="mt-2 text-xs font-semibold text-status-good">
                    {t('detail.saved')}
                </p>
            ) : null}
            {roleChange.error ? (
                <p role="alert" className="mt-2 text-xs font-semibold text-status-danger">
                    {toErrorMessage(roleChange.error)}
                </p>
            ) : null}

            {/* Role confirmation */}
            <ConfirmActionModal
                open={roleChange.requestedRole !== null}
                onCloseAction={roleChange.handleCloseConfirmation}
                title={t(toMarketing ? 'roleAccess.confirmMarketingTitle' : 'roleAccess.confirmUserTitle')}
                body={t(toMarketing ? 'roleAccess.confirmMarketingBody' : 'roleAccess.confirmUserBody')}
                confirmLabel={t('roleAccess.confirm')}
                cancelLabel={t('roleAccess.cancel')}
                tone={toMarketing ? 'default' : 'danger'}
                isConfirming={roleChange.isPending}
                onConfirmAction={roleChange.handleConfirm}
            />
        </section>
    );
}
