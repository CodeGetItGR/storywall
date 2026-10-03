'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { MemberRoleOptionDto } from '@/lib/api/types';
import { roleErrorKind } from '@/lib/memberRoles';

// Role errors as copy (guide §4). Length and cap messages carry numbers;
// 'locked' shows the picker's locked note instead. Every other code (blocked,
// stale, 5014, 3010…) has generic ApiErrors copy via useApiErrorMessage.
export function useRoleErrorMessage() {
    const t = useTranslations('MemberRoles.errors');
    const describe = useApiErrorMessage();

    return useCallback(
        (error: unknown, context: { maxLength: number; option: MemberRoleOptionDto | null }): string | null => {
            switch (roleErrorKind(error)) {
                case 'length':
                    return t('length', { max: context.maxLength });
                case 'full':
                    return context.option?.maxHolders ? t('full', { count: context.option.maxHolders }) : describe(error);
                case 'locked':
                    return null;
                default:
                    return describe(error);
            }
        },
        [describe, t],
    );
}
