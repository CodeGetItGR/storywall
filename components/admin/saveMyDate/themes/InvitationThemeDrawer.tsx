'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { InvitationThemeDetailsForm } from '@/components/admin/saveMyDate/themes/InvitationThemeDetailsForm';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminInvitationTheme } from '@/hooks/useAdminInvitationThemes';
import type { EventTypeOption } from '@/hooks/useInvitationThemesCatalog';
import type { AdminInvitationThemeDto } from '@/lib/adminInvitationThemes';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// One theme's details, loaded whole when the drawer opens. The form and its footer only
// mount once the theme is there.
export function InvitationThemeDrawer({
    themeId,
    title,
    eventTypes,
    onCloseAction,
    onDuplicateAction,
    onPreviewAction,
}: {
    themeId: string;
    // The list's name for the theme, shown while it loads.
    title: string;
    eventTypes: EventTypeOption[];
    onCloseAction: () => void;
    onDuplicateAction: (theme: AdminInvitationThemeDto) => void;
    onPreviewAction: (themeId: string) => void;
}) {
    const t = useTranslations('AdminPage.invitationThemes.drawer');
    const tAdmin = useTranslations('AdminPage');
    const themeQuery = useAdminInvitationTheme(themeId);
    // The first load only: a refetch behind the open form never swaps it out.
    const theme = themeQuery.data;

    return (
        <AdminDrawer open size="wide" onClose={onCloseAction} title={theme?.name ?? title} closeLabel={t('close')}>
            {/* Loading */}
            {!theme && themeQuery.isLoading && <LoadingState className="justify-start py-6" />}

            {/* Error */}
            {!theme && themeQuery.error && (
                <p role="alert" className="text-sm text-status-danger">
                    {tAdmin(`errors.${adminErrorMessageKey(themeQuery.error)}`)}
                </p>
            )}

            {/* Details */}
            {theme && (
                <InvitationThemeDetailsForm
                    key={theme.id}
                    theme={theme}
                    eventTypes={eventTypes}
                    onCloseAction={onCloseAction}
                    onDuplicateAction={onDuplicateAction}
                    onPreviewAction={onPreviewAction}
                />
            )}
        </AdminDrawer>
    );
}
