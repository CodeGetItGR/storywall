'use client';

import { useTranslations } from 'next-intl';

import { ThemeSwitchOption } from '@/components/saveMyDate/editor/theme/ThemeSwitchOption';
import { Modal } from '@/components/ui/modal';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';
import type { ThemeSwitchList, ThemeSwitchStep } from '@/hooks/useThemeSwitch';

type ThemeSwitchSheetProps = {
    step: ThemeSwitchStep;
    list: ThemeSwitchList;
    currentSlug: string;
    onChoose: (slug: string) => void;
    onRetryList: () => void;
    onClose: () => void;
};

const LOADING_TILES = 6;

// The designs made for this kind of event, to pick the invitation's new one from.
export function ThemeSwitchSheet({ step, list, currentSlug, onChoose, onRetryList, onClose }: ThemeSwitchSheetProps) {
    const t = useTranslations('InvitationEditor');
    const open = step.kind === 'picking' || step.kind === 'loading' || step.kind === 'failed';
    const busySlug = step.kind === 'loading' ? step.slug : null;

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('themeSwitch.change')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <h2 className="pr-10 text-base font-semibold">{t('themeSwitch.change')}</h2>

                {/* Design that didn't load */}
                {step.kind === 'failed' && (
                    <p role="alert" className="m-0 text-(--smd-editor-danger)">
                        {t('themeSwitch.themeFailed')}
                    </p>
                )}

                {/* Designs */}
                {list.kind === 'loading' && (
                    <SkeletonStatus className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {Array.from({ length: LOADING_TILES }, (_, index) => (
                            <Skeleton key={index} className="aspect-[9/15.6] rounded-xl" />
                        ))}
                    </SkeletonStatus>
                )}
                {list.kind === 'error' && (
                    <div className="flex flex-col items-start gap-2">
                        <p className="m-0 text-ink-muted">{t('themeSwitch.listFailed')}</p>
                        <button type="button" onClick={onRetryList} className="font-medium text-primary underline-offset-2 hover:underline">
                            {t('retry')}
                        </button>
                    </div>
                )}
                {list.kind === 'themes' && (
                    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
                        {list.themes.map((theme) => (
                            <li key={theme.slug}>
                                <ThemeSwitchOption
                                    theme={theme}
                                    isCurrent={theme.slug === currentSlug}
                                    isBusy={theme.slug === busySlug}
                                    disabled={busySlug !== null}
                                    onChoose={onChoose}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </Modal.Body>
        </Modal>
    );
}
