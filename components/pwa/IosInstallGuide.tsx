'use client';

import { CirclePlus, type LucideIcon, Share, SquarePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';

const steps: { key: 'share' | 'add' | 'confirm'; icon: LucideIcon }[] = [
    { key: 'share', icon: Share },
    { key: 'add', icon: SquarePlus },
    { key: 'confirm', icon: CirclePlus },
];

export function IosInstallGuide({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('InstallApp');

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" closeLabel={t('dismiss')} ariaLabel={t('iosGuide.title')} layer="overStory">
            <Modal.Body className="px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                {/* Header */}
                <h2 className="pr-10 text-lg font-bold text-ink">{t('iosGuide.title')}</h2>

                {/* Steps */}
                <ol className="mt-5 flex flex-col gap-4">
                    {steps.map(({ key, icon: Icon }, index) => (
                        <li key={key} className="flex items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-ink">
                                {index + 1}
                            </span>
                            <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{t(`iosGuide.steps.${key}`)}</p>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-[#007aff]">
                                <Icon className="h-5 w-5" aria-hidden="true" />
                            </span>
                        </li>
                    ))}
                </ol>

                {/* Footer */}
                <button
                    type="button"
                    onClick={onCloseAction}
                    className="mt-6 w-full rounded-full px-4 py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    {t('iosGuide.done')}
                </button>
            </Modal.Body>
        </Modal>
    );
}
