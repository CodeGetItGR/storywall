'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDisclosure } from '@/hooks/useDisclosure';

export function ResetDemoButton({ onResetAction }: { onResetAction: () => void }) {
    const t = useTranslations('Demo');
    const confirm = useDisclosure();

    return (
        <>
            <button
                type="button"
                onClick={confirm.toggle}
                aria-label={t('resetDemo')}
                title={t('resetDemo')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background"
            >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </button>
            <ConfirmActionModal
                open={confirm.open}
                title={t('resetTitle')}
                body={t('resetBody')}
                confirmLabel={t('resetDemo')}
                cancelLabel={t('resetCancel')}
                onCloseAction={confirm.toggle}
                onConfirmAction={onResetAction}
            />
        </>
    );
}
