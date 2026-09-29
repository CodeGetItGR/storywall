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
                className="inline-flex min-h-9 flex-none items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted"
            >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('resetDemo')}
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
