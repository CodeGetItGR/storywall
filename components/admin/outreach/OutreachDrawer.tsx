'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { OutreachDrawerContent } from '@/components/admin/outreach/OutreachDrawerContent';
import { OutreachStatusPill } from '@/components/admin/outreach/OutreachStatusPill';
import { LoadingState } from '@/components/ui/LoadingState';
import { useOutreachProspect } from '@/hooks/useAdminOutreach';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

// The hash owns this drawer's Back step (see useOutreachSelection), so it doesn't add its own.
export function OutreachDrawer({
    prospectId,
    open,
    onCloseAction,
    onClosedAction,
}: {
    prospectId: string | null;
    open: boolean;
    onCloseAction: () => void;
    onClosedAction: () => void;
}) {
    const t = useTranslations('AdminPage.outreach');
    const query = useOutreachProspect(prospectId);
    const toErrorMessage = useApiErrorMessage();
    const prospect = query.data;

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            onClosed={onClosedAction}
            dismissOnBack={false}
            size="wide"
            closeLabel={t('drawer.close')}
            title={prospect ? prospect.name : t('drawer.loadingTitle')}
            subtitle={prospect ? [t(`types.${prospect.type}`), prospect.city, prospect.area].filter(Boolean).join(' · ') : undefined}
        >
            {/* States */}
            {query.isLoading && <LoadingState className="justify-start py-6" />}
            {Boolean(query.error) && <p className="py-6 text-sm text-status-danger">{toErrorMessage(query.error)}</p>}

            {/* Content */}
            {prospect && (
                <>
                    <div className="-mt-1 flex items-center gap-2">
                        <OutreachStatusPill status={prospect.status} />
                        <span className="text-xs text-ink-faint">{t(`priority.${prospect.priority}`)}</span>
                    </div>
                    <OutreachDrawerContent key={prospect.id} prospect={prospect} onRemovedAction={onCloseAction} />
                </>
            )}
        </AdminDrawer>
    );
}
