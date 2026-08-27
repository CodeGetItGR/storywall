'use client';

import { useTranslations } from 'next-intl';

import { AccountDrawerContent } from '@/components/account/AccountDrawerContent';
import { Modal } from '@/components/ui/modal';

interface AccountDrawerProps {
    open: boolean;
    onCloseAction: () => void;
}

export function AccountDrawer({ open, onCloseAction }: AccountDrawerProps) {
    const t = useTranslations('AccountDrawer');

    return (
        <Modal open={open} onClose={onCloseAction} variant="drawer" ariaLabel={t('drawerLabel')} closeLabel={t('closeDrawer')}>
            {open && <AccountDrawerContent onCloseAction={onCloseAction} />}
        </Modal>
    );
}
