'use client';

import { useTranslations } from 'next-intl';

import { RoleFormBody } from '@/components/memberRoles/RoleFormBody';
import { RoleSheet } from '@/components/memberRoles/RoleSheet';
import { RoleSheetFooter } from '@/components/memberRoles/RoleSheetFooter';
import { useRoleForm } from '@/hooks/useRoleForm';
import type { EventMemberResponseDto } from '@/lib/api/types';

const FORM_ID = 'my-role-form';

export function MyRoleSheet({ eventId, member, onCloseAction }: { eventId: string; member: EventMemberResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('MemberRoles');
    const form = useRoleForm({ eventId, member, mode: 'self', onDoneAction: onCloseAction });

    return (
        <RoleSheet title={t('myRole')} closeLabel={t('close')} onCloseAction={onCloseAction} footer={<RoleSheetFooter formId={FORM_ID} form={form} />}>
            <RoleFormBody formId={FORM_ID} form={form} />
        </RoleSheet>
    );
}
